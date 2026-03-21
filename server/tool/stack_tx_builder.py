"""
tool/stack_tx_builder.py — Stacks Transaction Builder Wrapper
Delegates all heavy cryptography to the official Node.js SDK.
"""
from __future__ import annotations

import logging
import json
import subprocess
from pathlib import Path
from typing import Optional

import hashlib
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger(__name__)

_C32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def _c32encode(payload: bytes) -> str:
    num = int.from_bytes(payload, "big")
    digits = []
    while num > 0:
        num, rem = divmod(num, 32)
        digits.append(_C32[rem])
    for b in payload:
        if b == 0: digits.append(_C32[0])
        else: break
    return "".join(reversed(digits))

def principal_from_private_key(priv_hex: str, testnet: bool = True) -> str:
    """Retained for internal Vault address derivation."""
    clean = priv_hex[2:] if priv_hex.startswith("0x") else priv_hex
    if len(clean) == 66 and clean.endswith("01"): clean = clean[:64]
    priv_int = int.from_bytes(bytes.fromhex(clean), "big")
    key = ec.derive_private_key(priv_int, ec.SECP256K1(), default_backend())
    pub_bytes = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)
    h160 = hashlib.new("ripemd160", hashlib.sha256(pub_bytes).digest()).digest()
    version = 26 if testnet else 22
    checksum = hashlib.sha256(hashlib.sha256(bytes([version]) + h160).digest()).digest()[:4]
    return "S" + _C32[version] + _c32encode(h160 + checksum)

def _run_node_script(payload: dict) -> dict:
    script_path = Path(__file__).parent / "stacks_transfer.mjs"
    try:
        result = subprocess.run(
            ["node", str(script_path), json.dumps(payload)],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Get the last JSON line printed by Node
        output_str = result.stdout.strip().split("\n")[-1]  
        output = json.loads(output_str)
        
        if not output.get("success"):
            raise ValueError(output.get("error", "Unknown Node error"))
        return output
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Node execution failed. stderr: {e.stderr}")
        raise ValueError(f"Node execution failed: {e.stderr}")
    except json.JSONDecodeError:
        logger.error(f"Node returned invalid JSON. stdout: {result.stdout} | stderr: {result.stderr}")
        raise ValueError("Node returned invalid JSON")

def build_and_broadcast_stx_transfer(*, private_key_hex: str, recipient_address: str, amount_ustx: int, testnet: bool = True, fee_ustx: int = 200, api_base: Optional[str] = None) -> dict:
    logger.info(f"[StacksTx] Offloading STX drip to Node.js | recipient={recipient_address[:15]}... amount={amount_ustx}")
    # Strip '0x' prefix if present
    clean_pk = private_key_hex[2:] if private_key_hex.startswith("0x") else private_key_hex
    return _run_node_script({
        "type": "stx",
        "private_key": clean_pk,
        "recipient": recipient_address,
        "amount": amount_ustx
    })

def build_and_broadcast_sip010_transfer(*, private_key_hex: str, recipient_address: str, amount_atomic: int, contract_address: str, contract_name: str, testnet: bool = True, fee_ustx: int = 1000, memo: Optional[bytes] = None, api_base: Optional[str] = None) -> dict:
    logger.info(f"[StacksTx] Offloading SIP-010 transfer to Node.js | recipient={recipient_address[:15]}... amount={amount_atomic}")
    return _run_node_script({
        "type": "sip010",
        "private_key": private_key_hex,
        "recipient": recipient_address,
        "amount": amount_atomic,
        "contract_address": contract_address,
        "contract_name": contract_name,
        "memo": memo.decode('utf-8') if memo else ""
    })