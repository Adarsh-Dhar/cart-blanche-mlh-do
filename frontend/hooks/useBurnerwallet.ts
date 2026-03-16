/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Delegated Burner EOA Architecture — replaces the ERC-4337 Smart Wallet flow.
 *
 * Why this is simpler and more reliable on SKALE:
 *  - SKALE transactions are already GASLESS — no Paymasters or Bundlers needed
 *  - Standard EOA transactions work natively on every EVM chain
 *  - No METHOD_NOT_FOUND errors from missing ERC-4337 bundler infrastructure
 *  - Faster settlement (no alternative mempool wait)
 *
 * Flow:
 *  1. Generate a fresh temporary keypair (Burner Wallet) in-browser via viem
 *  2. User's MetaMask sends a standard USDC transfer to fund the Burner address
 *  3. Encrypted private key is saved to backend (/api/wallet/session-key)
 *  4. Backend settlement agent signs txs directly with the Burner key
 */

"use client";

import { useState, useCallback } from "react";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  parseUnits,
  type Address,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes, toHex } from "viem";

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

// ── USDC contract on SKALE Base Sepolia ───────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Simple XOR encryption — mirrors the Python decrypt in x402_settlement.py ──
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

  /**
   * Main flow: Generate burner → Fund with USDC → Save to backend
   */
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

      // ── Step 1: Generate the Burner Wallet ─────────────────────────────────
      setStatus("generating");

      const burnerPrivateKey = generatePrivateKey();
      const burnerAccount = privateKeyToAccount(burnerPrivateKey);
      const burnerAddress = burnerAccount.address;

      console.log("[BurnerWallet] Generated burner address:", burnerAddress);

      // ── Step 2: Fund the Burner via user's MetaMask ────────────────────────
      setStatus("funding");

      const walletClient = createWalletClient({
        chain: skaleBaseSepolia,
        transport: custom(window.ethereum),
      });

      const [ownerEoa] = await walletClient.requestAddresses();

      const fundCalldata = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [burnerAddress, parseUnits(fundAmountUsdc.toFixed(6), 6)],
      });

      console.log(
        `[BurnerWallet] Funding burner with $${fundAmountUsdc} USDC from ${ownerEoa}...`
      );

      const txHash = await walletClient.sendTransaction({
        account: ownerEoa,
        to: USDC_CONTRACT_ADDRESS,
        data: fundCalldata,
        chain: skaleBaseSepolia,
      });

      console.log("[BurnerWallet] Fund tx hash:", txHash);

      // ── Step 3: Save encrypted private key to backend ─────────────────────
      setStatus("saving");

      const expiresAt = new Date(
        Date.now() + sessionDurationHours * 60 * 60 * 1000
      );
      const encryptedKey = encryptPrivateKey(burnerPrivateKey, ownerEoa);

      const res = await fetch("/api/wallet/session-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Re-use the SmartWallet schema fields — burner address maps to smartWalletAddress
          smartWalletAddress: burnerAddress,
          sessionKeyPublic: burnerAddress,           // same for EOA (no separate session key)
          sessionKeyEncryptedPrivate: encryptedKey,
          spendLimitUsdc: fundAmountUsdc,
          expiresAt: expiresAt.toISOString(),
          ownerEoa: ownerEoa,
        }),
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
    },
    []
  );

  /**
   * Check if an active burner wallet session exists
   */
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