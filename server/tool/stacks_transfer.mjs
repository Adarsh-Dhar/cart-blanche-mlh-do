#!/usr/bin/env node
/**
 * stacks_transfer.mjs — SIP-010 Transfer via Official @stacks/transactions SDK
 *
 * Called from Python x402_settlement.py via subprocess.
 * Fixes the "Signer hash does not equal hash of public key" error caused by
 * the pure-Python signing implementation.
 *
 * Usage:
 *   node stacks_transfer.mjs '<JSON_PAYLOAD>'
 *
 * JSON payload fields:
 *   private_key        - hex string (66 chars with "01" suffix OR 64 chars raw)
 *   recipient_address  - Stacks principal (ST... or SP...)
 *   amount_atomic      - integer (micro-units, e.g. 1000000 = 1 USDCx)
 *   contract_address   - deployer principal (e.g. ST2YR7...)
 *   contract_name      - e.g. "usdcx-token"
 *   network            - "testnet" | "mainnet"
 *
 * Outputs JSON to stdout:
 *   { txid: "...", success: true }   — on success
 *   { error: "...", reason: "..." }  — on failure (exit code 1)
 *
 * Install deps once:
 *   cd server/tool && npm install @stacks/transactions @stacks/network
 */

import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
  noneCV,
  getAddressFromPrivateKey,
  TransactionVersion,
} from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network";

async function main() {
  let args;
  try {
    const raw = process.argv[2];
    if (!raw) throw new Error("No JSON argument provided");
    args = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: `Invalid args: ${e.message}` }) + "\n");
    process.exit(1);
  }

  const {
    private_key,
    recipient_address,
    amount_atomic,
    contract_address,
    contract_name,
    network: networkName = "testnet",
  } = args;

  // Validate required fields
  if (!private_key || !recipient_address || !amount_atomic || !contract_address || !contract_name) {
    process.stderr.write(JSON.stringify({ error: "Missing required fields" }) + "\n");
    process.exit(1);
  }

  const isTestnet = networkName !== "mainnet";
  const network = isTestnet ? new StacksTestnet() : new StacksMainnet();

  // CRITICAL FIX: getAddressFromPrivateKey() requires a TransactionVersion enum value
  // (a number: 128 for testnet, 0 for mainnet) — NOT the string "testnet"/"mainnet".
  // Passing a string caused: "Unexpected txVersion 'testnet' for hashMode 0"
  const txVersion = isTestnet ? TransactionVersion.Testnet : TransactionVersion.Mainnet;

  // Normalise private key: @stacks/transactions expects 66-char hex WITH "01" suffix
  let privKey = private_key.startsWith("0x") ? private_key.slice(2) : private_key;
  if (privKey.length === 64) privKey += "01";

  // Derive sender address using the correct numeric TransactionVersion
  const senderAddress = getAddressFromPrivateKey(privKey, txVersion);

  // Validate recipient is a valid Stacks principal
  if (!recipient_address.startsWith("S")) {
    process.stderr.write(
      JSON.stringify({ error: `Invalid Stacks recipient: ${recipient_address}` }) + "\n"
    );
    process.exit(1);
  }

  // Validate amount
  const amount = BigInt(Math.round(Number(amount_atomic)));
  if (amount <= 0n) {
    process.stderr.write(JSON.stringify({ error: `Invalid amount: ${amount_atomic}` }) + "\n");
    process.exit(1);
  }

  // SIP-010 transfer(amount uint, sender principal, recipient principal, memo optional<buff>)
  const txOptions = {
    contractAddress: contract_address,
    contractName: contract_name,
    functionName: "transfer",
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(recipient_address),
      noneCV(),
    ],
    senderKey: privKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    // Let the SDK fetch nonce automatically
  };

  let tx;
  try {
    tx = await makeContractCall(txOptions);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: `Build failed: ${e.message}` }) + "\n");
    process.exit(1);
  }

  let result;
  try {
    result = await broadcastTransaction(tx, network);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: `Broadcast failed: ${e.message}` }) + "\n");
    process.exit(1);
  }

  if (result.error) {
    process.stderr.write(
      JSON.stringify({ error: result.error, reason: result.reason, reason_data: result.reason_data }) + "\n"
    );
    process.exit(1);
  }

  // Success
  process.stdout.write(JSON.stringify({ txid: result.txid, success: true }) + "\n");
}

main().catch((e) => {
  process.stderr.write(JSON.stringify({ error: String(e) }) + "\n");
  process.exit(1);
});
