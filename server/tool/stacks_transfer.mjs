#!/usr/bin/env node
/**
 * stacks_transfer.mjs — Stacks SIP-010 & STX transfer via @stacks/transactions SDK
 */
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

// CommonJS interoperability for @stacks/network
import pkg from "@stacks/network";
const network = pkg.STACKS_TESTNET || new pkg.StacksTestnet();

function isValidStacksAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  if (addr[0] !== "S") return false;
  if (!"TPNMG".includes(addr[1])) return false;
  if (addr.length < 39 || addr.length > 42) return false;
  const c32 = new Set("0123456789ABCDEFGHJKMNPQRSTVWXYZ");
  return addr.slice(2).split("").every(c => c32.has(c));
}

async function main() {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("No JSON input provided");
    
    const data = JSON.parse(input);
    const { type, private_key, amount, memo, nonce } = data;
    
    // Clean strings and sanitize keys
    const recipient        = (data.recipient        || "").trim().replace(/['"]/g, "");
    const contract_address = (data.contract_address || "").trim().replace(/['"]/g, "");
    const contract_name    = (data.contract_name    || "").trim().replace(/['"]/g, "");
    const cleanPrivateKey  = (private_key           || "").trim().replace(/^0x/, "");
    
    // Cast to an integer string. This is the safest format across all Stacks SDK versions
    // and prevents BigInt parsing bugs.
    const safeAmountStr = Math.floor(Number(amount)).toString();

    let transaction;
    
    if (type === "stx") {
      if (!isValidStacksAddress(recipient)) {
        throw new Error(`Invalid Stacks recipient address: "${recipient}"`);
      }
      
      const stxOptions = {
        recipient,
        amount: safeAmountStr,
        senderKey: cleanPrivateKey,
        network,
        anchorMode: AnchorMode.Any,
        // Hardcode the fee to bypass flaky testnet fee estimation APIs
        fee: "500", 
      };
      
      // Only attach optional fields if they exist to prevent 'undefined' crashes
      if (memo) stxOptions.memo = memo;
      if (nonce !== undefined && nonce !== null) stxOptions.nonce = String(nonce);
      
      transaction = await makeSTXTokenTransfer(stxOptions);

    } else if (type === "sip010") {
      if (!isValidStacksAddress(recipient)) {
        throw new Error(`Invalid Stacks recipient address: "${recipient}"`);
      }
      
      const senderAddress = ((data.sender_address || "").trim()) ||
        getAddressFromPrivateKey(cleanPrivateKey, TransactionVersion.Testnet);
        
      if (!isValidStacksAddress(senderAddress)) {
        throw new Error(`Invalid Stacks sender address: "${senderAddress}"`);
      }
      
      const sipOptions = {
        contractAddress: contract_address,
        contractName:    contract_name,
        functionName:    "transfer",
        functionArgs: [
          uintCV(safeAmountStr),
          standardPrincipalCV(senderAddress),
          standardPrincipalCV(recipient),
          memo ? someCV(bufferCVFromString(memo)) : noneCV(),
        ],
        senderKey:         cleanPrivateKey,
        network,
        anchorMode:        AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        // Hardcode the fee for SIP-010 as well to be safe
        fee: "1500", 
      };
      
      if (nonce !== undefined && nonce !== null) sipOptions.nonce = String(nonce);
      
      transaction = await makeContractCall(sipOptions);
      
    } else {
      throw new Error(`Invalid transaction type: "${type}". Expected "stx" or "sip010".`);
    }

    const broadcastResponse = await broadcastTransaction(transaction, network);

    if (broadcastResponse.error) {
      throw new Error(
        `Broadcast failed: ${broadcastResponse.error}` +
        (broadcastResponse.reason ? ` — ${broadcastResponse.reason}` : "")
      );
    }
    
    console.log(JSON.stringify({ success: true, txid: broadcastResponse.txid }));

  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
  }
}

main();