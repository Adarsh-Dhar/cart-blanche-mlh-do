class SkaleBite:
    def encrypt(self, amount: int) -> dict:
        """
        Mock implementation of SKALE BITE v2 threshold encryption.
        In production, this would interact with the SKALE network.
        """
        return {
            "encrypted": True,
            "amount": amount,
            "protocol": "BITE-v2",
            "vault_id": "skale-mainnet-1"
        }

# Create the singleton instance used by graph.py
skale_bite = SkaleBite()