"""
tool/stack_tx_builder.py — Pure Python Stacks SIP-010 Transaction Builder
"""
from __future__ import annotations

import hashlib
import hmac as _hmac
import logging
import struct
from typing import Optional

import requests
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

CHAIN_ID_TESTNET     = 0x80000000
CHAIN_ID_MAINNET     = 0x00000001
TX_VERSION_TESTNET   = 0x80
TX_VERSION_MAINNET   = 0x00
ADDR_VERSION_TESTNET = 26
ADDR_VERSION_MAINNET = 22

STACKS_API_TESTNET = "https://api.testnet.hiro.so"
STACKS_API_MAINNET = "https://api.hiro.so"

PAYLOAD_CONTRACT_CALL   = 0x02
PAYLOAD_TOKEN_TRANSFER  = 0x00
AUTH_STANDARD           = 0x04
HASH_MODE_P2PKH         = 0x00
ANCHOR_ANY              = 0x03
POST_COND_ALLOW         = 0x01
KEY_ENCODING_COMPRESSED = 0x00

# FIX 1: Stacks uses SIGHASH_ALL = 0x01
SIGHASH_ALL             = b"\x01"

_P  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_N  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
_G  = (_GX, _GY)

def _sha256(d: bytes) -> bytes: return hashlib.sha256(d).digest()
def _sha256d(d: bytes) -> bytes: return _sha256(_sha256(d))
def _hash160(d: bytes) -> bytes: return hashlib.new("ripemd160", _sha256(d)).digest()
def _sha512_256(d: bytes) -> bytes: return hashlib.new("sha512_256", d).digest()
def _hmac_sha256(key: bytes, msg: bytes) -> bytes: return _hmac.new(key, msg, hashlib.sha256).digest()

_C32     = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
_C32_INV = {c: i for i, c in enumerate(_C32)}

# REVERTED to your original, mathematically correct logic
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
    checksum = _sha256d(bytes([version]) + h160)[:4]
    payload  = h160 + checksum
    return "S" + _C32[version] + _c32encode_payload(payload)

# REVERTED to your original, mathematically correct logic
def _parse_stacks_address(address: str) -> tuple[int, bytes]:
    if len(address) < 3:
        raise ValueError(f"Invalid Stacks address: {address!r}")
    version = _C32_INV.get(address[1])
    if version is None:
        raise ValueError(f"Unknown version character: {address[1]!r}")
    
    num = 0
    for ch in address[2:]:
        if ch not in _C32_INV:
            raise ValueError(f"Invalid c32 character: {ch!r}")
        num = num * 32 + _C32_INV[ch]
        
    raw = num.to_bytes(24, "big")
    h160 = raw[:20]
    return version, h160

def principal_from_private_key(priv_hex: str, testnet: bool = True) -> str:
    clean = priv_hex[2:] if priv_hex.startswith("0x") else priv_hex
    if len(clean) == 66 and clean.endswith("01"):
        clean = clean[:64]
    priv_int = int.from_bytes(bytes.fromhex(clean), "big")
    key = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    pub_bytes = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.CompressedPoint,
    )
    version = ADDR_VERSION_TESTNET if testnet else ADDR_VERSION_MAINNET
    return c32address(version, _hash160(pub_bytes))

def _modinv(a: int, m: int) -> int: return pow(a, m - 2, m)

def _point_add(P: Optional[tuple], Q: Optional[tuple]) -> Optional[tuple]:
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

def _point_mul(P: tuple, k: int) -> Optional[tuple]:
    R: Optional[tuple] = None
    while k:
        if k & 1: R = _point_add(R, P)
        P = _point_add(P, P)  # type: ignore[assignment]
        k >>= 1
    return R

def _rfc6979_k(priv_int: int, msg_hash: bytes) -> int:
    x = priv_int.to_bytes(32, "big")
    K = b"\x00" * 32; V = b"\x01" * 32
    K = _hmac_sha256(K, V + b"\x00" + x + msg_hash); V = _hmac_sha256(K, V)
    K = _hmac_sha256(K, V + b"\x01" + x + msg_hash); V = _hmac_sha256(K, V)
    while True:
        V = _hmac_sha256(K, V)
        k = int.from_bytes(V, "big")
        if 1 <= k < _N: return k
        K = _hmac_sha256(K, V + b"\x00"); V = _hmac_sha256(K, V)

def _sign_recoverable(priv_bytes: bytes, msg_hash: bytes) -> bytes:
    priv_int = int.from_bytes(priv_bytes, "big")
    z        = int.from_bytes(msg_hash, "big")
    k        = _rfc6979_k(priv_int, msg_hash)
    R        = _point_mul(_G, k)
    assert R is not None
    r = R[0] % _N
    s = (_modinv(k, _N) * (z + r * priv_int)) % _N
    
    recid = R[1] & 1
    if s > _N // 2:
        s = _N - s
        recid ^= 1  # FIX 2: Correct ECDSA parity recovery
        
    return bytes([recid]) + r.to_bytes(32, "big") + s.to_bytes(32, "big")

def _cv_uint128(value: int) -> bytes: return b"\x01" + value.to_bytes(16, "big")
def _cv_standard_principal(address: str) -> bytes:
    version, h160 = _parse_stacks_address(address)
    return b"\x05" + bytes([version]) + h160
def _cv_none() -> bytes: return b"\x09"
def _cv_some(inner: bytes) -> bytes: return b"\x0a" + inner
def _cv_buff(data: bytes) -> bytes: return b"\x02" + struct.pack(">I", len(data)) + data

def _payload_contract_call(contract_address: str, contract_name: str, function_name: str, function_args: list[bytes]) -> bytes:
    version, h160 = _parse_stacks_address(contract_address)
    name_b = contract_name.encode(); fn_b = function_name.encode()
    out = bytes([PAYLOAD_CONTRACT_CALL]) + bytes([version]) + h160
    out += struct.pack(">B", len(name_b)) + name_b
    out += struct.pack(">B", len(fn_b)) + fn_b
    out += struct.pack(">I", len(function_args))
    for arg in function_args: out += arg
    return out

def _payload_stx_transfer(recipient: str, amount_ustx: int) -> bytes:
    version, h160 = _parse_stacks_address(recipient)
    out = bytes([PAYLOAD_TOKEN_TRANSFER]) + b"\x05" + bytes([version]) + h160
    out += struct.pack(">Q", amount_ustx) + b"\x00" * 34
    return out

def _spending_condition(pub_bytes: bytes, nonce: int, fee: int, sig65: bytes = b"\x00" * 65) -> bytes:
    out = bytes([HASH_MODE_P2PKH]) + _hash160(pub_bytes)
    out += struct.pack(">Q", nonce) + struct.pack(">Q", fee)
    out += bytes([KEY_ENCODING_COMPRESSED]) + sig65
    return out

def _build_tx(payload: bytes, spending_cond: bytes, testnet: bool) -> bytes:
    version  = TX_VERSION_TESTNET if testnet else TX_VERSION_MAINNET
    chain_id = CHAIN_ID_TESTNET   if testnet else CHAIN_ID_MAINNET
    out = bytes([version]) + struct.pack(">I", chain_id)
    out += bytes([AUTH_STANDARD]) + spending_cond
    out += bytes([ANCHOR_ANY]) + bytes([POST_COND_ALLOW]) + struct.pack(">I", 0) + payload
    return out

def _presig_hash(tx_bytes: bytes) -> bytes:
    return _sha512_256(tx_bytes + SIGHASH_ALL)

def _fetch_nonce(address: str, api_base: str) -> int:
    try:
        resp = requests.get(f"{api_base}/v2/accounts/{address}", params={"proof": 0}, timeout=15)
        resp.raise_for_status()
        return int(resp.json().get("nonce", 0))
    except Exception as exc:
        logger.warning("[StacksTx] Could not fetch nonce for %s (using 0): %s", address, exc)
        return 0

def _priv_to_pub_bytes(private_key_hex: str) -> bytes:
    clean = private_key_hex[2:] if private_key_hex.startswith("0x") else private_key_hex
    if len(clean) == 66 and clean.endswith("01"): clean = clean[:64]
    priv_int = int.from_bytes(bytes.fromhex(clean), "big")
    key_obj  = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    return key_obj.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)

def _priv_raw_bytes(private_key_hex: str) -> bytes:
    clean = private_key_hex[2:] if private_key_hex.startswith("0x") else private_key_hex
    if len(clean) == 66 and clean.endswith("01"): clean = clean[:64]
    return bytes.fromhex(clean)

def build_and_broadcast_sip010_transfer(*, private_key_hex: str, recipient_address: str, amount_atomic: int, contract_address: str, contract_name: str, testnet: bool = True, fee_ustx: int = 1000, memo: Optional[bytes] = None, api_base: Optional[str] = None) -> dict:
    pub_bytes = _priv_to_pub_bytes(private_key_hex); priv_bytes = _priv_raw_bytes(private_key_hex)
    sender = principal_from_private_key(private_key_hex, testnet=testnet)
    api = api_base or (STACKS_API_TESTNET if testnet else STACKS_API_MAINNET)
    nonce = _fetch_nonce(sender, api)

    logger.info("[StacksTx] SIP-010 transfer | sender=%s nonce=%d → recipient=%s amount=%d", sender, nonce, recipient_address, amount_atomic)

    args = [
        _cv_uint128(amount_atomic), _cv_standard_principal(sender),
        _cv_standard_principal(recipient_address),
        _cv_none() if not memo else _cv_some(_cv_buff(memo[:34]))
    ]
    payload = _payload_contract_call(contract_address, contract_name, "transfer", args)

    unsigned_sc = _spending_condition(pub_bytes, nonce, fee_ustx)
    unsigned_tx = _build_tx(payload, unsigned_sc, testnet)
    presig      = _presig_hash(unsigned_tx)
    sig65       = _sign_recoverable(priv_bytes, presig)
    signed_sc   = _spending_condition(pub_bytes, nonce, fee_ustx, sig65)
    signed_tx   = _build_tx(payload, signed_sc, testnet)

    resp = requests.post(f"{api}/v2/transactions", data=signed_tx, headers={"Content-Type": "application/octet-stream"}, timeout=30)
    if not resp.ok: raise ValueError(f"Broadcast failed (HTTP {resp.status_code}): {resp.text[:400]}")
    txid = resp.text.strip().strip('"')
    logger.info("[StacksTx] ✓ txid: %s", txid)
    return {"success": True, "txid": txid, "txHash": txid, "network": "testnet" if testnet else "mainnet"}

def build_and_broadcast_stx_transfer(*, private_key_hex: str, recipient_address: str, amount_ustx: int, testnet: bool = True, fee_ustx: int = 200, api_base: Optional[str] = None) -> dict:
    pub_bytes = _priv_to_pub_bytes(private_key_hex); priv_bytes = _priv_raw_bytes(private_key_hex)
    sender = principal_from_private_key(private_key_hex, testnet=testnet)
    api = api_base or (STACKS_API_TESTNET if testnet else STACKS_API_MAINNET)
    nonce = _fetch_nonce(sender, api)

    logger.info("[StacksTx] STX drip | sender=%s nonce=%d → recipient=%s amount=%d μSTX", sender, nonce, recipient_address, amount_ustx)

    payload = _payload_stx_transfer(recipient_address, amount_ustx)
    unsigned_sc = _spending_condition(pub_bytes, nonce, fee_ustx)
    unsigned_tx = _build_tx(payload, unsigned_sc, testnet)
    presig      = _presig_hash(unsigned_tx)
    sig65       = _sign_recoverable(priv_bytes, presig)
    signed_sc   = _spending_condition(pub_bytes, nonce, fee_ustx, sig65)
    signed_tx   = _build_tx(payload, signed_sc, testnet)

    resp = requests.post(f"{api}/v2/transactions", data=signed_tx, headers={"Content-Type": "application/octet-stream"}, timeout=30)
    if not resp.ok: raise ValueError(f"STX drip broadcast failed (HTTP {resp.status_code}): {resp.text[:300]}")
    txid = resp.text.strip().strip('"')
    logger.info("[StacksTx] STX drip ✓ txid: %s", txid)
    return {"success": True, "txid": txid}