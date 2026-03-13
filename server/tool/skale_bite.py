"""
tool/skale_bite.py — SKALE BITE v2 threshold encryption
=========================================================
In production replace SkaleBite.encrypt() with a real call to the
SKALE BITE v2 API.  The interface (and the dict shape it returns)
must stay identical so vault_node continues to work without changes.
"""

from __future__ import annotations


class SkaleBite:
    def encrypt(self, amount: int) -> dict:
        """
        Encrypt a USDC amount (6-decimal integer) via SKALE BITE v2.
        Returns a dict stored in AgentState.encrypted_budget.

        Args:
            amount: total USDC amount in 6-decimal units
                    (e.g. $39.69 → 39_690_000)

        Returns:
            {
              "encrypted": bool,
              "amount":    int,   # original value
              "protocol":  str,
              "vault_id":  str,
            }
        """
        return {
            "encrypted": True,
            "amount":    amount,
            "protocol":  "BITE-v2",
            "vault_id":  "skale-mainnet-1",
        }


# Module-level singleton used by vault_node
skale_bite = SkaleBite()