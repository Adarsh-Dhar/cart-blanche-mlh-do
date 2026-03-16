/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed version with confirmed transfers.
 */

"use client";

import { useState, useCallback } from "react";
import {
  createWalletClient,
  createPublicClient, // Added
  http,               // Added
  custom,
  encodeFunctionData,
  parseUnits,
  keccak256,
  toBytes,
  toHex,
  type Address,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// ── Chain config (SKALE Base Sepolia) ─────────────────────────────────────────
export const skaleBaseSepolia = {
  id: 324705682,
  name: "SKALE Base Sepolia Testnet",
  network: "skale-base-sepolia",
  nativeCurrency: { name: "SKALE Credits", symbol: "CREDIT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha"],
    },
  },
  blockExplorers: {
    default: { name: "SKALE Explorer", url: "https://base-sepolia-testnet-explorer.skalenodes.com" },
  },
} as const;

const USDC_CONTRACT_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address;

const USDC_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface BurnerWalletInfo {
  burnerAddress: Address;
  ownerEoa: Address;
  fundedAmount: number;
  expiresAt: Date;
}

export type BurnerWalletStatus = "idle" | "generating" | "funding" | "saving" | "ready" | "error";

function encryptPrivateKey(privateKey: string, ownerAddress: string): string {
  const keyHex = keccak256(toBytes(ownerAddress.toLowerCase()));
  const pkBytes = toBytes(privateKey as `0x${string}`);
  const keyBytes = toBytes(keyHex);
  const encrypted = pkBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return toHex(new Uint8Array(encrypted));
}

export function useBurnerWallet() {
  const [status, setStatus] = useState<BurnerWalletStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<BurnerWalletInfo | null>(null);

  const authorizeShoppingAgent = useCallback(
    async ({
      fundAmountUsdc = 100,
      sessionDurationHours = 24,
    }: {
      fundAmountUsdc?: number;
      sessionDurationHours?: number;
    } = {}): Promise<BurnerWalletInfo> => {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      setError(null);

      try {
        // 1. Generate Burner
        setStatus("generating");
        const burnerPrivateKey = generatePrivateKey();
        const burnerAccount = privateKeyToAccount(burnerPrivateKey);
        const burnerAddress = burnerAccount.address;

        // 2. Fund Burner (Wait for On-chain Confirmation)
        setStatus("funding");
        
        const walletClient = createWalletClient({
          chain: skaleBaseSepolia,
          transport: custom(window.ethereum),
        });

        const publicClient = createPublicClient({
          chain: skaleBaseSepolia,
          transport: http(),
        });

        const [ownerEoa] = await walletClient.requestAddresses();

        console.log(`[BurnerWallet] Sending $${fundAmountUsdc} USDC transfer...`);
        
        const hash = await walletClient.sendTransaction({
          account: ownerEoa,
          to: USDC_CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: "transfer",
            args: [burnerAddress, parseUnits(fundAmountUsdc.toString(), 6)],
          }),
        });

        // CRITICAL: Stop and wait for the blockchain to actually move the money
        console.log("[BurnerWallet] Waiting for confirmation:", hash);
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("[BurnerWallet] Transfer Confirmed.");

        // 3. Save to Backend
        setStatus("saving");
        const expiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);
        const encryptedKey = encryptPrivateKey(burnerPrivateKey, ownerEoa);

        const payload = {
          smartWalletAddress: burnerAddress,
          sessionKeyPublic: burnerAddress,
          sessionKeyEncryptedPrivate: encryptedKey,
          spendLimitUsdc: fundAmountUsdc,
          expiresAt: expiresAt.toISOString(),
          ownerEoa: ownerEoa,
        };

        const res = await fetch("/api/wallet/session-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to save burner wallet to backend");

        const info: BurnerWalletInfo = { burnerAddress, ownerEoa, fundedAmount: fundAmountUsdc, expiresAt };
        setWalletInfo(info);
        setStatus("ready");
        return info;
      } catch (err: any) {
        console.error("[BurnerWallet] Error:", err);
        setError(err.message || "An error occurred");
        setStatus("error");
        throw err;
      }
    },
    []
  );

  const checkExistingSession = useCallback(async (): Promise<BurnerWalletInfo | null> => {
    try {
      const res = await fetch("/api/wallet/session-key");
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.data) return null;
      const expiresAt = new Date(data.data.expiresAt);
      if (expiresAt < new Date()) return null;
      const info: BurnerWalletInfo = {
        burnerAddress: data.data.smartWalletAddress as Address,
        ownerEoa: data.data.ownerEoa as Address,
        fundedAmount: parseFloat(data.data.spendLimitUsdc),
        expiresAt,
      };
      setWalletInfo(info);
      return info;
    } catch { return null; }
  }, []);

  return { status, error, walletInfo, authorizeShoppingAgent, checkExistingSession };
}