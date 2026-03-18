/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stacks blockchain edition.
 *
 * Uses @stacks/transactions and @stacks/connect to:
 * 1. Generate a Stacks burner principal
 * 2. Fund it with USDCx or sBTC via Leather/Xverse wallet (openContractCall)
 * 3. Save the encrypted key to the backend
 *
 * XOR encryption key: sha256(stacksPrincipal.toLowerCase())
 * Mirrors server-side decryption in tool/x402_settlement.py
 */

"use client";

import { useState, useCallback } from "react";
import {
  makeRandomPrivKey,
  getAddressFromPrivateKey,
  standardPrincipalCV,
  uintCV,
  noneCV,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";

// ── Noble hashes ──────────────────────────────────────────────────────────────
// @noble/hashes v2 exports sha256 directly from the sha2 module.
// The package.json lists "@noble/hashes": "^2.0.1" so we use the v2 paths.
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ── Stacks Testnet contract addresses ─────────────────────────────────────────
// Deployer from Clarinet.toml / usdcx-project settings
const USDCX_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_USDCX_CONTRACT_ADDRESS ||
  "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4";
const USDCX_CONTRACT_NAME = "usdcx-token";

const SBTC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT_ADDRESS ||
  "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4";
const SBTC_CONTRACT_NAME = "sbtc-token";

export type FundingAsset = "USDCx" | "sBTC";

export interface BurnerWalletInfo {
  burnerAddress: string;    // Stacks principal e.g. ST...
  ownerPrincipal: string;   // Connected Stacks wallet principal
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

// ── XOR encryption using sha256 ───────────────────────────────────────────────
// Key = sha256(ownerPrincipal.toLowerCase())
// Must mirror server/tool/x402_settlement.py _decrypt_burner_key()
function encryptPrivateKey(privateKeyHex: string, ownerPrincipal: string): string {
  const keyBytes = sha256(new TextEncoder().encode(ownerPrincipal.toLowerCase()));
  const clean    = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const pkBytes  = hexToBytes(clean);
  const encrypted = new Uint8Array(pkBytes.length);
  for (let i = 0; i < pkBytes.length; i++) {
    encrypted[i] = pkBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return "0x" + bytesToHex(encrypted);
}

// ── Extract raw private key hex from makeRandomPrivKey result ─────────────────
// @stacks/transactions v7 makeRandomPrivKey() can return StacksPrivateKey | string
function extractPrivKeyHex(privKey: unknown): string {
  if (typeof privKey === "string") return privKey;
  // StacksPrivateKey shape: { data: Uint8Array | string }
  const pk = privKey as { data?: unknown };
  if (pk.data instanceof Uint8Array) return bytesToHex(pk.data);
  if (typeof pk.data === "string") return pk.data;
  throw new Error("Cannot extract private key hex from makeRandomPrivKey result");
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBurnerWallet() {
  const [status, setStatus]     = useState<BurnerWalletStatus>("idle");
  const [error, setError]       = useState<string | null>(null);
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
      ownerStacksAddress: string;
    }): Promise<BurnerWalletInfo> => {
      setError(null);

      try {
        // ── Step 1: Generate Stacks burner key & address ─────────────────────
        setStatus("generating");

        const rawPrivKey    = makeRandomPrivKey();
        const privKeyHex    = extractPrivKeyHex(rawPrivKey);
        // getAddressFromPrivateKey(hex, networkString) in @stacks/transactions v7
        const burnerAddress = getAddressFromPrivateKey(privKeyHex, "testnet");

        if (!burnerAddress || !burnerAddress.startsWith("S")) {
          throw new Error(`Generated invalid burner address: ${burnerAddress}`);
        }

        console.log("[BurnerWallet] Generated Stacks burner principal:", burnerAddress);

        // ── Step 2: Fund burner via openContractCall ──────────────────────────
        const decimals      = fundingAsset === "USDCx" ? 6 : 8;
        const amountAtomic  = Math.floor(fundAmountUsdc * Math.pow(10, decimals));

        const contractAddress = fundingAsset === "USDCx" ? USDCX_CONTRACT_ADDRESS : SBTC_CONTRACT_ADDRESS;
        const contractName    = fundingAsset === "USDCx" ? USDCX_CONTRACT_NAME    : SBTC_CONTRACT_NAME;

        // SIP-010 transfer(amount, sender, recipient, memo)
        // Note: sender is the owner's wallet (tx-sender in Clarity)
        // The contract checks tx-sender === sender arg
        const functionArgs = [
          uintCV(amountAtomic),
          standardPrincipalCV(ownerStacksAddress),   // sender = owner wallet
          standardPrincipalCV(burnerAddress),        // recipient = burner
          noneCV(),                                  // memo = none
        ];

        setStatus("funding");

        await new Promise<void>((resolve, reject) => {
          openContractCall({
            contractAddress,
            contractName,
            functionName: "transfer",
            functionArgs,
            network:    STACKS_TESTNET,
            onFinish: (data) => {
              console.log("[BurnerWallet] Transfer tx broadcasted:", data.txId);
              resolve();
            },
            onCancel: () => {
              reject(new Error("User cancelled the funding transaction."));
            },
          });
        });

        // ── Step 3: Save encrypted key to backend ────────────────────────────
        setStatus("saving");

        const expiresAt    = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);
        const encryptedKey = encryptPrivateKey(privKeyHex, ownerStacksAddress);

        const savePayload = {
          smartWalletAddress:         burnerAddress,
          sessionKeyPublic:           burnerAddress,
          sessionKeyEncryptedPrivate: encryptedKey,
          spendLimitUsdc:             fundAmountUsdc,
          expiresAt:                  expiresAt.toISOString(),
          ownerEoa:                   ownerStacksAddress,   // Stacks principal in ownerEoa field
          fundingAsset,
        };

        const res = await fetch("/api/wallet/session-key", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(savePayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Failed to save burner wallet: ${errData.error || res.statusText}`);
        }

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
        console.error("[BurnerWallet] Error:", err);
        setError(msg);
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
    },
    []
  );

  return { status, error, walletInfo, authorizeShoppingAgent, checkExistingSession };
}