/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Delegated Burner EOA Architecture
 */

"use client";

import { useState, useCallback } from "react";
import {
  createWalletClient,
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
      http: [
        "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "SKALE Explorer",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com",
    },
  },
} as const;

const USDC_CONTRACT_ADDRESS =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address;

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

export type BurnerWalletStatus =
  | "idle"
  | "generating"
  | "funding"
  | "saving"
  | "ready"
  | "error";

// ── XOR encryption ────────────────────────────────────────────────────────────
function encryptPrivateKey(privateKey: string, ownerAddress: string): string {
  const keyHex = keccak256(toBytes(ownerAddress.toLowerCase()));
  const pkBytes = toBytes(privateKey as `0x${string}`);
  const keyBytes = toBytes(keyHex);
  const encrypted = pkBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return toHex(new Uint8Array(encrypted));
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
    }: {
      fundAmountUsdc?: number;
      sessionDurationHours?: number;
    } = {}): Promise<BurnerWalletInfo> => {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      setError(null);

      try {
        setStatus("generating");

        const burnerPrivateKey = generatePrivateKey();
        const burnerAccount = privateKeyToAccount(burnerPrivateKey);
        const burnerAddress = burnerAccount.address;

        console.log("[BurnerWallet] Generated burner address:", burnerAddress);

        setStatus("funding");

        const walletClient = createWalletClient({
          chain: skaleBaseSepolia,
          transport: custom(window.ethereum),
        });

        const [ownerEoa] = await walletClient.requestAddresses();

        const fundCalldata = encodeFunctionData({
          abi: USDC_ABI,
          functionName: "transfer",
          args: [burnerAddress, parseUnits(fundAmountUsdc.toString(), 6)],
        });

        console.log(`[BurnerWallet] Funding burner with $${fundAmountUsdc} USDC from ${ownerEoa}...`);

        const txHash = await walletClient.sendTransaction({
          account: ownerEoa,
          to: USDC_CONTRACT_ADDRESS,
          data: fundCalldata,
          chain: skaleBaseSepolia,
        });

        console.log("[BurnerWallet] Fund tx hash:", txHash);

        setStatus("saving");

        const expiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);
        
        // Encrypting the RAW private key string using the EOA as the XOR key
        const encryptedKey = encryptPrivateKey(burnerPrivateKey, ownerEoa);

        // Using the EXACT schema names your backend route expects
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

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save burner wallet to backend");
        }

        const info: BurnerWalletInfo = {
          burnerAddress,
          ownerEoa,
          fundedAmount: fundAmountUsdc,
          expiresAt,
        };

        setWalletInfo(info);
        setStatus("ready");

        console.log("[BurnerWallet] Setup complete. Agent authorized.");
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
          burnerAddress: data.data.smartWalletAddress as Address,
          ownerEoa: data.data.ownerEoa as Address,
          fundedAmount: parseFloat(data.data.spendLimitUsdc),
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

  return {
    status,
    error,
    walletInfo,
    authorizeShoppingAgent,
    checkExistingSession,
  };
}