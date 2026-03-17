"""
tool/stacks_tx_builder.py — Pure Python Stacks SIP-010 Transaction Builder
===========================================================================

Constructs, signs, and broadcasts Stacks contract-call transactions
(SIP-010 token transfers) using only Python standard library +
the `cryptography` package (already a dependency via web3.py).

No Node.js subprocess required.

Implements the Stacks wire format following:
  SIP-005: https://github.com/stacksgov/sips/blob/main/sips/sip-005/

Supported:
  - SIP-010 `transfer` (amount, sender, recipient, memo)
  - STX transfer (for fee dripping to burner principal)
  - Testnet and Mainnet

Key crypto:
  - secp256k1 signing (RFC 6979 deterministic k, pure Python field math)
  - Stacks presig hash: sha512/256(tx_bytes || sighash_type)
  - Recoverable signature: 65 bytes = [recovery_id || r || s]
  - c32check address encoding (pure Python, no base58 dependency)
"""
from __future__ import annotations

import hashlib
import hmac as _hmac
import logging
import os
import struct
from typing import Optional

import requests
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

# ── Network constants ──────────────────────────────────────────────────────────
CHAIN_ID_TESTNET    = 0x80000000
CHAIN_ID_MAINNET    = 0x00000001
TX_VERSION_TESTNET  = 0x80
TX_VERSION_MAINNET  = 0x00
ADDR_VERSION_TESTNET = 26   # P2PKH testnet ('T')
ADDR_VERSION_MAINNET = 22   # P2PKH mainnet ('P')

STACKS_API_TESTNET = "https://api.testnet.hiro.so"
STACKS_API_MAINNET = "https://api.hiro.so"

# Wire-format constants
PAYLOAD_CONTRACT_CALL  = 0x02
PAYLOAD_TOKEN_TRANSFER = 0x00
AUTH_STANDARD          = 0x04
HASH_MODE_P2PKH        = 0x00
ANCHOR_ANY             = 0x03
POST_COND_ALLOW        = 0x01
KEY_ENCODING_COMPRESSED = 0x05
SIGHASH_ALL            = b"\x04"

# secp256k1 curve parameters
_P  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_N  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
_G  = (_GX, _GY)


# ── Hashing helpers ────────────────────────────────────────────────────────────

def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def _sha256d(data: bytes) -> bytes:
    return _sha256(_sha256(data))

def _hash160(data: bytes) -> bytes:
    return hashlib.new("ripemd160", _sha256(data)).digest()

def _sha512_256(data: bytes) -> bytes:
    return hashlib.new("sha512_256", data).digest()

def _hmac_sha256(key: bytes, msg: bytes) -> bytes:
    return _hmac.new(key, msg, hashlib.sha256).digest()


# ── c32check address encoding (pure Python) ───────────────────────────────────

_C32     = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_C32_INV = {c: i for i, c in enumerate(_C32)}


def _c32encode_payload(payload: bytes) -> str:
    num = int.from_bytes(payload, "big")
    digits: list[str] = []
    while num > 0:
        num, rem = divmod(num, 32)
        digits.append(_C32[rem])
    for b in payload:
        if b == 0:
            digits.append(_C32[0])
        else:
            break
    return "".join(reversed(digits))


def c32address(version: int, h160: bytes) -> str:
    """Encode hash160 + version as a Stacks address: 'S' + version_char + c32body."""
    checksum = _sha256d(bytes([version]) + h160)[:4]
    payload  = h160 + checksum
    return "S" + _C32[version] + _c32encode_payload(payload)


def _parse_stacks_address(address: str) -> tuple[int, bytes]:
    """Return (version, hash160) from a Stacks address string."""
    version = _C32_INV[address[1]]
    num = 0
    for ch in address[2:]:
        num = num * 32 + _C32_INV[ch]
    raw  = num.to_bytes(24, "big")   # 20 hash160 + 4 checksum
    return version, raw[:20]


def principal_from_private_key(priv_hex: str, testnet: bool = True) -> str:
    """Derive a Stacks principal (ST... / SP...) from a hex private key."""
    priv_bytes = bytes.fromhex(priv_hex[2:] if priv_hex.startswith("0x") else priv_hex)
    priv_int   = int.from_bytes(priv_bytes, "big")
    key        = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    pub_bytes  = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.CompressedPoint,
    )
    version = ADDR_VERSION_TESTNET if testnet else ADDR_VERSION_MAINNET
    return c32address(version, _hash160(pub_bytes))


# ── secp256k1 field math ───────────────────────────────────────────────────────

def _modinv(a: int, m: int) -> int:
    return pow(a, m - 2, m)


def _point_add(P, Q):
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0]:
        if P[1] != Q[1]: return None
        lam = (3 * P[0] * P[0] * _modinv(2 * P[1], _P)) % _P
    else:
        lam = ((Q[1] - P[1]) * _modinv(Q[0] - P[0], _P)) % _P
    x = (lam * lam - P[0] - Q[0]) % _P
    y = (lam * (P[0] - x) - P[1]) % _P
    return (x, y)


def _point_mul(P, k: int):
    R = None
    while k:
        if k & 1:
            R = _point_add(R, P)
        P = _point_add(P, P)
        k >>= 1
    return R


# ── RFC 6979 deterministic k ───────────────────────────────────────────────────

def _rfc6979_k(priv_int: int, msg_hash: bytes) -> int:
    x  = priv_int.to_bytes(32, "big")
    h1 = msg_hash
    K  = b"\x00" * 32
    V  = b"\x01" * 32
    K  = _hmac_sha256(K, V + b"\x00" + x + h1)
    V  = _hmac_sha256(K, V)
    K  = _hmac_sha256(K, V + b"\x01" + x + h1)
    V  = _hmac_sha256(K, V)
    while True:
        V = _hmac_sha256(K, V)
        k = int.from_bytes(V, "big")
        if 1 <= k < _N:
            return k
        K = _hmac_sha256(K, V + b"\x00")
        V = _hmac_sha256(K, V)


def _sign_recoverable(priv_bytes: bytes, msg_hash: bytes) -> bytes:
    """
    Sign a 32-byte message hash with secp256k1.
    Returns a 65-byte recoverable signature: [recovery_id] + r (32) + s (32).

    msg_hash must be the Stacks presig hash (sha512/256 of the transaction bytes).
    RFC 6979 ensures deterministic k.
    """
    priv_int = int.from_bytes(priv_bytes, "big")
    z        = int.from_bytes(msg_hash,   "big")
    k        = _rfc6979_k(priv_int, msg_hash)
    R        = _point_mul(_G, k)
    assert R is not None
    r        = R[0] % _N
    s        = (_modinv(k, _N) * (z + r * priv_int)) % _N
    # Low-S normalisation (BIP-62)
    if s > _N // 2:
        s = _N - s
    recovery_id = R[1] & 1
    return bytes([recovery_id]) + r.to_bytes(32, "big") + s.to_bytes(32, "big")


# ── Clarity value serialisation ────────────────────────────────────────────────

def _cv_uint128(value: int) -> bytes:
    """Clarity UInt — type 0x01, 16-byte big-endian."""
    return b"\x01" + value.to_bytes(16, "big")


def _cv_standard_principal(address: str) -> bytes:
    """Clarity StandardPrincipal — type 0x05, version (1), hash160 (20)."""
    version, h160 = _parse_stacks_address(address)
    return b"\x05" + bytes([version]) + h160


def _cv_none() -> bytes:
    """Clarity (none) — type 0x09."""
    return b"\x09"


def _cv_some(inner: bytes) -> bytes:
    """Clarity (some val) — type 0x0a."""
    return b"\x0a" + inner


def _cv_buff(data: bytes) -> bytes:
    """Clarity buffer — type 0x02, length (4), data."""
    return b"\x02" + struct.pack(">I", len(data)) + data


# ── Transaction wire format ────────────────────────────────────────────────────

def _payload_contract_call(
    contract_address: str,
    contract_name: str,
    function_name: str,
    function_args: list[bytes],
) -> bytes:
    version, h160 = _parse_stacks_address(contract_address)
    name_b        = contract_name.encode()
    fn_b          = function_name.encode()
    out  = bytes([PAYLOAD_CONTRACT_CALL])
    out += bytes([version]) + h160                       # contract address (21 bytes)
    out += struct.pack(">B", len(name_b)) + name_b       # contract name length-prefixed
    out += struct.pack(">B", len(fn_b))   + fn_b         # function name length-prefixed
    out += struct.pack(">I", len(function_args))         # arg count
    for arg in function_args:
        out += arg
    return out


def _payload_stx_transfer(recipient: str, amount_ustx: int) -> bytes:
    version, h160 = _parse_stacks_address(recipient)
    memo_padded   = b"\x00" * 34
    out  = bytes([PAYLOAD_TOKEN_TRANSFER])
    out += b"\x05" + bytes([version]) + h160             # RecipientPrincipal (standard)
    out += struct.pack(">Q", amount_ustx)                # amount (8 bytes)
    out += memo_padded                                   # memo (34 bytes)
    return out


def _spending_condition(
    pub_bytes: bytes,
    nonce: int,
    fee: int,
    sig65: bytes = b"\x00" * 65,
) -> bytes:
    out  = bytes([HASH_MODE_P2PKH])
    out += _hash160(pub_bytes)           # signer (20 bytes)
    out += struct.pack(">Q", nonce)      # nonce (8 bytes)
    out += struct.pack(">Q", fee)        # fee   (8 bytes)
    out += bytes([KEY_ENCODING_COMPRESSED])
    out += sig65                         # signature (65 bytes)
    return out


def _build_tx(payload: bytes, spending_cond: bytes, testnet: bool) -> bytes:
    version  = TX_VERSION_TESTNET  if testnet else TX_VERSION_MAINNET
    chain_id = CHAIN_ID_TESTNET    if testnet else CHAIN_ID_MAINNET
    out  = bytes([version])
    out += struct.pack(">I", chain_id)
    out += bytes([AUTH_STANDARD]) + spending_cond
    out += bytes([ANCHOR_ANY])
    out += bytes([POST_COND_ALLOW])
    out += struct.pack(">I", 0)          # zero post-conditions
    out += payload
    return out


def _presig_hash(tx_bytes: bytes) -> bytes:
    """Stacks presig hash: sha512/256(tx_bytes || SIGHASH_ALL)."""
    return _sha512_256(tx_bytes + SIGHASH_ALL)


# ── Nonce helper ───────────────────────────────────────────────────────────────

def _fetch_nonce(address: str, api_base: str) -> int:
    try:
        resp = requests.get(
            f"{api_base}/v2/accounts/{address}",
            params={"proof": 0},
            timeout=15,
        )
        resp.raise_for_status()
        return int(resp.json().get("nonce", 0))
    except Exception as exc:
        logger.warning("[StacksTx] Could not fetch nonce for %s (using 0): %s", address[:16], exc)
        return 0


# ── Public API ────────────────────────────────────────────────────────────────

def build_and_broadcast_sip010_transfer(
    *,
    private_key_hex: str,
    recipient_address: str,
    amount_atomic: int,
    contract_address: str,
    contract_name: str,
    testnet: bool = True,
    fee_ustx: int = 1000,
    memo: Optional[bytes] = None,
    api_base: Optional[str] = None,
) -> dict:
    """
    Build, sign, and broadcast a SIP-010 token transfer.

    Args:
        private_key_hex:   Hex 32-byte secp256k1 private key
        recipient_address: Destination Stacks principal (ST... / SP...)
        amount_atomic:     Token amount in smallest unit (6 decimals for USDCx)
        contract_address:  SIP-010 contract publisher principal
        contract_name:     SIP-010 contract name e.g. "usdcx-token"
        testnet:           True for Stacks Testnet, False for Mainnet
        fee_ustx:          Fee in micro-STX (default 1000 = 0.001 STX)
        memo:              Optional bytes memo
        api_base:          Override Stacks API URL

    Returns:
        dict: { success: True, txid: str, network: str }

    Raises:
        ValueError on broadcast failure
    """
    priv_bytes = bytes.fromhex(
        private_key_hex[2:] if private_key_hex.startswith("0x") else private_key_hex
    )
    priv_int   = int.from_bytes(priv_bytes, "big")
    key_obj    = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    pub_bytes  = key_obj.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.CompressedPoint,
    )
    sender     = principal_from_private_key(private_key_hex, testnet=testnet)
    api        = api_base or (STACKS_API_TESTNET if testnet else STACKS_API_MAINNET)
    nonce      = _fetch_nonce(sender, api)

    logger.info(
        "[StacksTx] SIP-010 transfer | sender=%s nonce=%d → recipient=%s amount=%d",
        sender[:20], nonce, recipient_address[:20], amount_atomic,
    )

    # Clarity args: transfer(amount uint, sender principal, recipient principal, memo optional<buff>)
    args = [
        _cv_uint128(amount_atomic),
        _cv_standard_principal(sender),
        _cv_standard_principal(recipient_address),
        _cv_none() if not memo else _cv_some(_cv_buff(memo)),
    ]
    payload    = _payload_contract_call(contract_address, contract_name, "transfer", args)
    empty_sc   = _spending_condition(pub_bytes, nonce, fee_ustx)
    unsigned   = _build_tx(payload, empty_sc, testnet)
    sig65      = _sign_recoverable(priv_bytes, _presig_hash(unsigned))
    signed_sc  = _spending_condition(pub_bytes, nonce, fee_ustx, sig65)
    signed_tx  = _build_tx(payload, signed_sc, testnet)

    resp = requests.post(
        f"{api}/v2/transactions",
        data=signed_tx,
        headers={"Content-Type": "application/octet-stream"},
        timeout=30,
    )
    if not resp.ok:
        raise ValueError(
            f"Broadcast failed (HTTP {resp.status_code}): {resp.text[:400]}"
        )
    txid = resp.text.strip().strip('"')
    logger.info("[StacksTx] ✓ txid: %s", txid)
    return {"success": True, "txid": txid, "txHash": txid,
            "network": "testnet" if testnet else "mainnet"}


def build_and_broadcast_stx_transfer(
    *,
    private_key_hex: str,
    recipient_address: str,
    amount_ustx: int,
    testnet: bool = True,
    fee_ustx: int = 200,
    api_base: Optional[str] = None,
) -> dict:
    """
    Build, sign, and broadcast a plain STX transfer.
    Used to drip fee STX to the burner principal before settlement.

    Args:
        private_key_hex:   Master wallet private key (holds testnet STX)
        recipient_address: Burner principal to receive STX
        amount_ustx:       Amount in micro-STX (1 STX = 1_000_000 μSTX)
        testnet:           True for testnet
        fee_ustx:          Fee in micro-STX (default 200)
        api_base:          Override Stacks API URL

    Returns:
        dict: { success: True, txid: str }
    """
    priv_bytes = bytes.fromhex(
        private_key_hex[2:] if private_key_hex.startswith("0x") else private_key_hex
    )
    priv_int  = int.from_bytes(priv_bytes, "big")
    key_obj   = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    pub_bytes = key_obj.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.CompressedPoint,
    )
    sender    = principal_from_private_key(private_key_hex, testnet=testnet)
    api       = api_base or (STACKS_API_TESTNET if testnet else STACKS_API_MAINNET)
    nonce     = _fetch_nonce(sender, api)

    logger.info(
        "[StacksTx] STX drip | sender=%s nonce=%d → recipient=%s amount=%d μSTX",
        sender[:20], nonce, recipient_address[:20], amount_ustx,
    )

    payload   = _payload_stx_transfer(recipient_address, amount_ustx)
    empty_sc  = _spending_condition(pub_bytes, nonce, fee_ustx)
    unsigned  = _build_tx(payload, empty_sc, testnet)
    sig65     = _sign_recoverable(priv_bytes, _presig_hash(unsigned))
    signed_sc = _spending_condition(pub_bytes, nonce, fee_ustx, sig65)
    signed_tx = _build_tx(payload, signed_sc, testnet)

    resp = requests.post(
        f"{api}/v2/transactions",
        data=signed_tx,
        headers={"Content-Type": "application/octet-stream"},
        timeout=30,
    )
    if not resp.ok:
        raise ValueError(
            f"STX drip broadcast failed (HTTP {resp.status_code}): {resp.text[:300]}"
        )
    txid = resp.text.strip().strip('"')
    logger.info("[StacksTx] STX drip ✓ txid: %s", txid)
    return {"success": True, "txid": txid}