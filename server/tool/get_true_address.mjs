import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions';

// Grab the private key passed from the terminal
const privKey = process.argv[2];

if (!privKey) {
    console.error("❌ Error: Please provide your private key.");
    process.exit(1);
}

try {
    // 0x80 is the testnet version byte
    const address = getAddressFromPrivateKey(privKey, TransactionVersion.Testnet);
    console.log("\n=======================================================");
    console.log("✅ YOUR TRUE, MATHEMATICALLY VALID ADDRESS IS:");
    console.log(address);
    console.log("=======================================================\n");
} catch (e) {
    console.error("Failed to parse key:", e.message);
}