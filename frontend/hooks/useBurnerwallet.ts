/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stacks blockchain edition (migrated from SKALE/EVM).
 * 
 * Uses @stacks/transactions and @stacks/connect to:
 * 1. Generate a Stacks burner principal
 * 2. Fund it with USDCx or sBTC via Leather/Xverse wallet
 * 3. Save the encrypted key to the backend
 * 
 * XOR encryption key uses sha256(stacksPrincipal) instead of keccak256(eoa).
 */

"use client";

import { useState, useCallback } from "react";
import {
  makeRandomPrivKey,
  getAddressFromPrivateKey,
  standardPrincipalCV,
  uintCV,
  noneCV,
  NoneCV,
  StandardPrincipalCV,
  UIntCV,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ── Stacks Testnet config ─────────────────────────────────────────────────────

// ── USDCx SIP-010 contract on Stacks Testnet ──────────────────────────────────
// Replace with actual deployed USDCx contract address for testnet
const USDCX_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDCX_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const USDCX_CONTRACT_NAME = "usdcx";

// ── sBTC SIP-010 contract on Stacks Testnet ────────────────────────────────────
const SBTC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SBTC_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const SBTC_CONTRACT_NAME = "sbtc-token";

export type FundingAsset = "USDCx" | "sBTC";

export interface BurnerWalletInfo {
  burnerAddress: string;   // Stacks principal e.g. ST...
  ownerPrincipal: string;  // Connected Stacks wallet principal
  fundedAmount: number;
  fundingAsset: FundingAsset;
  expiresAt: Date;
}

export type BurnerWalletStatus =
  | "idle"
  | "generating"
  | "funding"
  | "saving"
  | "ready"
  | "error";

// ── XOR encryption using sha256 (Stacks-compatible) ──────────────────────────
// Mirrors the server-side decryption in stacks_tx_builder.ts
function encryptPrivateKey(privateKey: string, ownerPrincipal: string): string {
  const keyBytes = sha256(new TextEncoder().encode(ownerPrincipal.toLowerCase()));
  const pkBytes = hexToBytes(privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey);
  const encrypted = pkBytes.map((b: number, i: number) => b ^ keyBytes[i % keyBytes.length]);
  return "0x" + bytesToHex(new Uint8Array(encrypted));
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBurnerWallet() {
  const [status, setStatus] = useState<BurnerWalletStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<BurnerWalletInfo | null>(null);

  const authorizeShoppingAgent = useCallback(
    async ({
      fundAmountUsdc = 100,
      sessionDurationHours = 24,
      fundingAsset = "USDCx" as FundingAsset,
      ownerStacksAddress,
    }: {
      fundAmountUsdc?: number;
      sessionDurationHours?: number;
      fundingAsset?: FundingAsset;
      ownerStacksAddress: string; // Must be passed from connected Leather/Xverse wallet
    }): Promise<BurnerWalletInfo> => {
      setError(null);

      try {
        // ── Step 1: Generate Stacks burner key & address ─────────────────────
        setStatus("generating");
        // 1. Generate the random private key
        const burnerPrivKey = makeRandomPrivKey();
        // 2. Extract the hex string (safely handles both v6 and v7 of stacks.js)
        const burnerPrivKeyHex = typeof burnerPrivKey === 'string' 
          ? burnerPrivKey 
          : Buffer.from((burnerPrivKey as any).data).toString('hex');
        // 3. Generate the Testnet address by passing the literal 'testnet'
        const burnerAddress = getAddressFromPrivateKey(
          burnerPrivKeyHex,
          'testnet'
        );

        console.log("[BurnerWallet] Generated Stacks burner principal:", burnerAddress);

        // ── Step 2: Fund burner via openContractCall (Leather/Xverse popup) ──
        // Amount in token's smallest unit (USDCx = 6 decimals, sBTC = 8 decimals)
        const decimals = fundingAsset === "USDCx" ? 6 : 8;
        const fundAmountAtomic = Math.floor(fundAmountUsdc * Math.pow(10, decimals));

        const contractAddress = fundingAsset === "USDCx" ? USDCX_CONTRACT_ADDRESS : SBTC_CONTRACT_ADDRESS;
        const contractName = fundingAsset === "USDCx" ? USDCX_CONTRACT_NAME : SBTC_CONTRACT_NAME;

        // ── Step 2a: Check sender balance ──
        // Helper to fetch SIP-010 token balance
        async function getTokenBalance(contractAddress: string, contractName: string, principal: string) {
          try {
            const url = `https://api.testnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/balance-of?sender=${principal}`;
            const body = {
              arguments: [
                { type: "principal", value: principal }
              ]
            };
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
            const data = await res.json();
            // Parse result: SIP-010 returns uint balance
            if (data && data.result && data.result.value) {
              return BigInt(data.result.value);
            }
            return BigInt(0);
          } catch (err) {
            console.error("[BurnerWallet] Error fetching token balance:", err);
            return BigInt(0);
          }
        }

        const senderBalance = await getTokenBalance(contractAddress, contractName, ownerStacksAddress);
        console.log(`[BurnerWallet] Sender balance:`, senderBalance.toString());
        if (senderBalance < BigInt(fundAmountAtomic)) {
          const errMsg = `[BurnerWallet] Insufficient balance: ${senderBalance} < ${fundAmountAtomic}`;
          console.error(errMsg);
          setError(errMsg);
          setStatus("error");
          throw new Error(errMsg);
        }
        setStatus("funding");

        // Validate parameters
        if (!contractAddress || typeof contractAddress !== "string" || !contractAddress.startsWith("ST")) {
          console.error("[BurnerWallet] Invalid contractAddress:", contractAddress);
        }
        if (!contractName || typeof contractName !== "string") {
          console.error("[BurnerWallet] Invalid contractName:", contractName);
        }
        if (!ownerStacksAddress || typeof ownerStacksAddress !== "string" || !ownerStacksAddress.startsWith("ST")) {
          console.error("[BurnerWallet] Invalid ownerStacksAddress:", ownerStacksAddress);
        }
        if (!burnerAddress || typeof burnerAddress !== "string" || !burnerAddress.startsWith("ST")) {
          console.error("[BurnerWallet] Invalid burnerAddress:", burnerAddress);
        }
        if (!Number.isInteger(fundAmountAtomic) || fundAmountAtomic <= 0) {
          console.error("[BurnerWallet] Invalid fundAmountAtomic:", fundAmountAtomic);
        }

        // Log all contract call parameters for debugging
        console.log('[BurnerWallet] openContractCall params:', {
          contractAddress,
          contractName,
          functionName: 'transfer',
          functionArgs: [
            fundAmountAtomic,
            ownerStacksAddress,
            burnerAddress,
            null,
          ],
          network: STACKS_TESTNET,
        });

        // Log CV conversion
        let cvArgs: (UIntCV | StandardPrincipalCV | NoneCV)[];
        try {
          // SIP-010 transfer expects: amount, recipient, memo
          cvArgs = [
            uintCV(fundAmountAtomic),
            standardPrincipalCV(burnerAddress),
            noneCV(),
          ];
          console.log('[BurnerWallet] CV Args:', cvArgs);
        } catch (cvErr) {
          console.error('[BurnerWallet] Error converting functionArgs to CV:', cvErr);
        }

        await new Promise<void>((resolve, reject) => {
          try {
            openContractCall({
              contractAddress,
              contractName,
              functionName: "transfer",
              functionArgs: cvArgs,
              network: STACKS_TESTNET,
              onFinish: (data) => {
                console.log("[BurnerWallet] Transfer tx broadcasted:", data.txId);
                resolve();
              },
              onCancel: () => {
                reject(new Error("User cancelled the funding transaction."));
              },
            });
          } catch (err) {
            console.error('[BurnerWallet] openContractCall error:', err);
            reject(err);
          }
        });

        // ── Step 3: Save encrypted key to backend ────────────────────────────
        setStatus("saving");
        const expiresAt = new Date(
          Date.now() + sessionDurationHours * 60 * 60 * 1000
        );

        const encryptedKey = encryptPrivateKey(burnerPrivKeyHex, ownerStacksAddress);

        const savePayload = {
          smartWalletAddress: burnerAddress,       // Stacks principal as "address"
          sessionKeyPublic: burnerAddress,
          sessionKeyEncryptedPrivate: encryptedKey,
          spendLimitUsdc: fundAmountUsdc,
          expiresAt: expiresAt.toISOString(),
          ownerEoa: ownerStacksAddress,            // Stacks principal stored in ownerEoa field
          fundingAsset,
        };

        const res = await fetch("/api/wallet/session-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savePayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            `Failed to save burner wallet: ${errData.error || res.statusText}`
          );
        }

        const info: BurnerWalletInfo = {
          burnerAddress,
          ownerPrincipal: ownerStacksAddress,
          fundedAmount: fundAmountUsdc,
          fundingAsset,
          expiresAt,
        };
        setWalletInfo(info);
        setStatus("ready");
        return info;
      } catch (err: any) {
        console.error("[BurnerWallet] Error:", err);
        setError(err.message || "An unknown error occurred");
        setStatus("error");
        throw err;
      }
    },
    []
  );

  const checkExistingSession = useCallback(
    async (): Promise<BurnerWalletInfo | null> => {
      try {
        const res = await fetch("/api/wallet/session-key");
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.data) return null;
        const expiresAt = new Date(data.data.expiresAt);
        if (expiresAt < new Date()) return null;
        const info: BurnerWalletInfo = {
          burnerAddress: data.data.smartWalletAddress,
          ownerPrincipal: data.data.ownerEoa,
          fundedAmount: parseFloat(data.data.spendLimitUsdc),
          fundingAsset: (data.data.fundingAsset as FundingAsset) || "USDCx",
          expiresAt,
        };
        setWalletInfo(info);
        return info;
      } catch {
        return null;
      }
    },
    []
  );

  return { status, error, walletInfo, authorizeShoppingAgent, checkExistingSession };
}