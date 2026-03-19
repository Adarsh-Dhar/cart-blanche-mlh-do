#!/usr/bin/env node
import {
  makeContractCall,
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  standardPrincipalCV,
  noneCV,
  someCV,
  bufferCVFromString,
  getAddressFromPrivateKey,
  TransactionVersion
} from "@stacks/transactions";

async function main() {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("No JSON input provided");
    
    const data = JSON.parse(input);
    const { type, private_key, amount, memo } = data;
    
    // Bulletproof cleaning for addresses (Removes spaces, newlines, and stray quotes)
    const recipient = data.recipient ? data.recipient.trim().replace(/['"]/g, '') : "";
    const contract_address = data.contract_address ? data.contract_address.trim().replace(/['"]/g, '') : "";
    const contract_name = data.contract_name ? data.contract_name.trim().replace(/['"]/g, '') : "";
    
    let transaction;
    const network = "testnet";
    
    if (type === "stx") {
        transaction = await makeSTXTokenTransfer({
            recipient: recipient,
            amount: amount,
            senderKey: private_key,
            network: network,
            memo: memo || "",
            anchorMode: AnchorMode.Any,
        });
    } else if (type === "sip010") {
        // Use the address provided by Python (derived by frontend SDK v8)
        // Avoids SDK v6/v8 incompatibility in getAddressFromPrivateKey
        const senderAddress = (data.sender_address || "").trim() || 
            getAddressFromPrivateKey(private_key, TransactionVersion.Testnet);

        transaction = await makeContractCall({
            contractAddress: contract_address,
            contractName: contract_name,
            functionName: "transfer",
            functionArgs: [
                uintCV(amount),
                standardPrincipalCV(senderAddress),
                standardPrincipalCV(recipient),
                memo ? someCV(bufferCVFromString(memo)) : noneCV()
            ],
            senderKey: private_key,
            network: network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Allow,
        });
    } else {
        throw new Error("Invalid transaction type");
    }

    const broadcastResponse = await broadcastTransaction(transaction, network);
    if (broadcastResponse.error) {
        throw new Error(`${broadcastResponse.error} - ${broadcastResponse.reason}`);
    }
    
    console.log(JSON.stringify({ success: true, txid: broadcastResponse.txid }));
  } catch (error) {
      console.log(JSON.stringify({ success: false, error: error.message }));
  }
}

main();