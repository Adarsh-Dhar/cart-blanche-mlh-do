#!/usr/bin/env node
/**
 * stacks_transfer.mjs — Stacks SIP-010 transfer via @stacks/transactions SDK
 *
 * FIX APPLIED: Added pre-flight c32check address validation before calling
 * standardPrincipalCV(), which produces an unhelpful "invalid length" error.
 * Now fails with a clear, actionable message.
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

/**
 * Validate a Stacks c32check principal address.
 * Must be exactly 41 characters: S + version_char + 38 c32 chars.
 */
function isValidStacksAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  if (addr.length !== 41) return false;
  if (addr[0] !== "S") return false;
  if (!"TPNMG".includes(addr[1])) return false;
  const c32 = new Set("0123456789ABCDEFGHJKMNPQRSTVWXYZ");
  return addr.slice(2).split("").every(c => c32.has(c));
}

async function main() {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("No JSON input provided");
    
    const data = JSON.parse(input);
    const { type, private_key, amount, memo, nonce } = data;
    
    // Clean addresses — remove whitespace and stray quotes
    const recipient        = (data.recipient        || "").trim().replace(/['"]/g, "");
    const contract_address = (data.contract_address || "").trim().replace(/['"]/g, "");
    const contract_name    = (data.contract_name    || "").trim().replace(/['"]/g, "");
    
    let transaction;
    const network = "testnet";
    
    if (type === "stx") {
      // Pre-flight validate recipient
      if (!isValidStacksAddress(recipient)) {
        throw new Error(
          `Invalid Stacks recipient address: "${recipient}" ` +
          `(length=${recipient.length}, expected 41). ` +
          `Update the vendor's pubkey in /admin/vendors.`
        );
      }

      transaction = await makeSTXTokenTransfer({
        recipient,
        amount,
        senderKey: private_key,
        network,
        memo: memo || "",
        anchorMode: AnchorMode.Any,
        ...(nonce !== undefined ? { nonce: BigInt(nonce) } : {}),
      });

    } else if (type === "sip010") {
      // Pre-flight validate recipient before calling standardPrincipalCV,
      // which throws an obscure "invalid length" error on bad addresses.
      if (!isValidStacksAddress(recipient)) {
        throw new Error(
          `Invalid Stacks recipient address: "${recipient}" ` +
          `(length=${recipient.length}, expected 41). ` +
          `Update the vendor's pubkey in /admin/vendors to a valid Stacks address.`
        );
      }

      const senderAddress = ((data.sender_address || "").trim()) ||
        getAddressFromPrivateKey(private_key, TransactionVersion.Testnet);

      if (!isValidStacksAddress(senderAddress)) {
        throw new Error(
          `Invalid Stacks sender address: "${senderAddress}" ` +
          `(length=${senderAddress.length}, expected 41).`
        );
      }

      transaction = await makeContractCall({
        contractAddress: contract_address,
        contractName:    contract_name,
        functionName:    "transfer",
        functionArgs: [
          uintCV(amount),
          standardPrincipalCV(senderAddress),
          standardPrincipalCV(recipient),
          memo ? someCV(bufferCVFromString(memo)) : noneCV(),
        ],
        senderKey:         private_key,
        network,
        anchorMode:        AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        ...(nonce !== undefined ? { nonce: BigInt(nonce) } : {}),
      });

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
