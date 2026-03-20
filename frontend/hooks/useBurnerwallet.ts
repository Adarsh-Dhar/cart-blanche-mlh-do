/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stacks blockchain edition.
 *
 * ROOT CAUSE OF "0 USDCx" BUG:
 *   The fallback USDCX_CONTRACT_ADDRESS was hardcoded to ST1PQHQ... here,
 *   while mint/page.tsx hardcoded ST2YR7... — two different contracts.
 *   Both pages query the Hiro API with {contractAddress}.{contractName}::{asset}
 *   as the key, so mismatched addresses → no key match → 0 balance.
 *
 * FIX: Import all contract addresses from lib/stacks-config.ts (single
 * source of truth) so every file uses the same deployer address.
 */

"use client";

import { useState, useCallback } from "react";
import {
  makeRandomPrivKey,
  getAddressFromPrivateKey,
  standardPrincipalCV,
  uintCV,
  noneCV,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ── Single source of truth for all contract addresses ─────────────────────────
import {
  USDCX_CONTRACT_ADDRESS,
  USDCX_CONTRACT_NAME,
  USDCX_DECIMALS,
  SBTC_CONTRACT_ADDRESS,
  SBTC_CONTRACT_NAME,
  SBTC_DECIMALS,
  fetchTokenBalance,
} from "@/lib/stacks-config";

export type FundingAsset = "USDCx" | "sBTC";

export interface BurnerWalletInfo {
  burnerAddress:  string;
  ownerPrincipal: string;
  fundedAmount:   number;
  fundingAsset:   FundingAsset;
  expiresAt:      Date;
}

export type BurnerWalletStatus =
  | "idle"
  | "generating"
  | "funding"
  | "saving"
  | "ready"
  | "error";

// ── XOR encryption ─────────────────────────────────────────────────────────────
function encryptPrivateKey(privateKeyHex: string, ownerPrincipal: string): string {
  const keyBytes  = sha256(new TextEncoder().encode(ownerPrincipal.toLowerCase()));
  const clean     = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const pkBytes   = hexToBytes(clean);
  const encrypted = new Uint8Array(pkBytes.length);
  for (let i = 0; i < pkBytes.length; i++) {
    encrypted[i] = pkBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return "0x" + bytesToHex(encrypted);
}

// ── Private key extraction ────────────────────────────────────────────────────
// ── Private key extraction ────────────────────────────────────────────────────
function extractPrivKeyHex(privKey: unknown): string {
  let hex: string;
  if (typeof privKey === "string") {
    hex = privKey;
  } else {
    const pk = privKey as { data?: unknown };
    if (pk.data instanceof Uint8Array) hex = bytesToHex(pk.data);
    else if (typeof pk.data === "string") hex = pk.data;
    else throw new Error("Cannot extract private key hex from makeRandomPrivKey result");
  }
  
  // Remove "0x" prefix if present
  let clean = hex.startsWith("0x") ? hex.slice(2) : hex;

  // Stacks requires a 33-byte (66 hex char) compressed key.
  // A raw key is 32 bytes (64 hex chars).
  // If it's exactly 64 chars, it's missing the compression flag.
  if (clean.length === 64) {
    clean += "01"; 
  }
  
  // If it's shorter than 64, it lost leading zeros during hex conversion. Pad it.
  if (clean.length < 64) {
     clean = clean.padStart(64, "0") + "01";
  }

  // Ensure it is exactly 66 characters before returning
  if (clean.length !== 66) {
      console.warn(`[BurnerWallet] Unexpected private key length: ${clean.length} chars. Key: ${clean}`);
  }

  return clean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBurnerWallet() {
  const [status,     setStatus]     = useState<BurnerWalletStatus>("idle");
  const [error,      setError]      = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<BurnerWalletInfo | null>(null);

  /** Fetch + log the USDCx balance of any Stacks address. */
  const logBalance = useCallback(
    async (address: string, label = "address"): Promise<number> => {
      const bal = await fetchTokenBalance(address);
      console.log(`[BurnerWallet] USDCx balance of ${label} (${address}): ${bal}`);
      return bal;
    },
    [],
  );

  const authorizeShoppingAgent = useCallback(
    async ({
      fundAmountUsdc       = 100,
      sessionDurationHours = 24,
      fundingAsset         = "USDCx" as FundingAsset,
      ownerStacksAddress,
    }: {
      fundAmountUsdc?:       number;
      sessionDurationHours?: number;
      fundingAsset?:         FundingAsset;
      ownerStacksAddress:    string;
    }): Promise<BurnerWalletInfo> => {
      setError(null);

      try {
        console.log("[BurnerWallet] ── Starting authorization ──");
        console.log("[BurnerWallet] Owner:", ownerStacksAddress);
        console.log("[BurnerWallet] Asset:", fundingAsset, "| Amount:", fundAmountUsdc);

        // Check owner has enough balance before opening the wallet popup
        const ownerBalanceBefore = await logBalance(ownerStacksAddress, "owner (before)");
        if (ownerBalanceBefore < fundAmountUsdc) {
          console.warn(
            `[BurnerWallet] Low balance: ${ownerBalanceBefore} < requested ${fundAmountUsdc}`,
          );
        }

        // ── Step 1: Generate burner key + address ─────────────────────────────
        setStatus("generating");
        const rawPrivKey    = makeRandomPrivKey();
        const privKeyHex    = extractPrivKeyHex(rawPrivKey);
        const burnerAddress = getAddressFromPrivateKey(privKeyHex, );

        if (!burnerAddress?.startsWith("S")) {
          throw new Error(`Generated invalid burner address: "${burnerAddress}"`);
        }
        console.log("[BurnerWallet] ✓ Burner principal:", burnerAddress);

        // ── Step 2: Fund burner via wallet popup ──────────────────────────────
        const isUSDCx      = fundingAsset === "USDCx";
        const decimals     = isUSDCx ? USDCX_DECIMALS : SBTC_DECIMALS;
        const contractAddr = isUSDCx ? USDCX_CONTRACT_ADDRESS : SBTC_CONTRACT_ADDRESS;
        const contractName = isUSDCx ? USDCX_CONTRACT_NAME    : SBTC_CONTRACT_NAME;
        const amountAtomic = Math.floor(fundAmountUsdc * Math.pow(10, decimals));

        console.log("[BurnerWallet] Contract:", `${contractAddr}.${contractName}`);
        console.log("[BurnerWallet] Amount atomic:", amountAtomic);

        // SIP-010 transfer(amount uint, sender principal, recipient principal, memo optional<buff>)
        // Clarity asserts: (is-eq tx-sender sender) → sender MUST be ownerStacksAddress
        const functionArgs = [
          uintCV(amountAtomic),
          standardPrincipalCV(ownerStacksAddress),  // sender  = connected wallet (tx-sender)
          standardPrincipalCV(burnerAddress),       // recipient = burner
          noneCV(),                                 // memo = none
        ];
        const contractAddress = `${contractAddr}.${contractName}`;

        setStatus("funding");

        await new Promise<void>((resolve, reject) => {
          openContractCall({
            contractAddress,
            contractName,
            functionName: "transfer",
            functionArgs,
            // THE FIX: Explicitly allow the transfer logic to simulate
            postConditionMode: PostConditionMode.Allow, 
            // THE FIX: Use an instantiated network object
            network: STACKS_TESTNET,               
            onFinish: (data) => {
              console.log("[BurnerWallet] Transfer tx broadcasted:", data.txId);
              resolve();
            },
            onCancel: () => {
              reject(new Error("User cancelled the funding transaction."));
            },
          });
        });

        // ── Step 3: Save encrypted key to backend ─────────────────────────────
        setStatus("saving");
        const expiresAt    = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);
        const encryptedKey = encryptPrivateKey(privKeyHex, ownerStacksAddress);

        const res = await fetch("/api/wallet/session-key", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            smartWalletAddress:         burnerAddress,
            sessionKeyPublic:           burnerAddress,
            sessionKeyEncryptedPrivate: encryptedKey,
            spendLimitUsdc:             fundAmountUsdc,
            expiresAt:                  expiresAt.toISOString(),
            ownerEoa:                   ownerStacksAddress,
            fundingAsset,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Failed to save burner wallet: ${err.error || res.statusText}`);
        }
        console.log("[BurnerWallet] ✓ Session key saved.");

        const info: BurnerWalletInfo = {
          burnerAddress,
          ownerPrincipal: ownerStacksAddress,
          fundedAmount:   fundAmountUsdc,
          fundingAsset,
          expiresAt,
        };
        setWalletInfo(info);
        setStatus("ready");
        return info;

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("[BurnerWallet] ✗ Error:", err);
        setError(msg);
        setStatus("error");
        throw err;
      }
    },
    [logBalance],
  );

  const checkExistingSession = useCallback(async (): Promise<BurnerWalletInfo | null> => {
    try {
      const res  = await fetch("/api/wallet/session-key");
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.data) return null;
      const expiresAt = new Date(data.data.expiresAt);
      if (expiresAt < new Date()) return null;
      const info: BurnerWalletInfo = {
        burnerAddress:  data.data.smartWalletAddress,
        ownerPrincipal: data.data.ownerEoa,
        fundedAmount:   parseFloat(data.data.spendLimitUsdc),
        fundingAsset:   (data.data.fundingAsset as FundingAsset) || "USDCx",
        expiresAt,
      };
      setWalletInfo(info);
      return info;
    } catch {
      return null;
    }
  }, []);

  return { status, error, walletInfo, authorizeShoppingAgent, checkExistingSession, logBalance };
}