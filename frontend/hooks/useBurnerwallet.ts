/**
 * hooks/useBurnerWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed version:
 *   - Uses SKALE Base Sepolia chain for ALL operations (funding + settlement)
 *   - Uses the USDC contract deployed on SKALE Base Sepolia (not Ethereum Sepolia)
 *   - Switches MetaMask to SKALE network before sending the funding tx
 *   - Uses http() transport for publicClient (not custom — avoids MetaMask for reads)
 *   - Verifies USDC balance on the burner address after transfer confirms
 */

"use client";

import { useState, useCallback } from "react";
import {
  createWalletClient,
  createPublicClient,
  http,
  custom,
  encodeFunctionData,
  parseUnits,
  keccak256,
  toBytes,
  toHex,
  type Address,
  type Chain,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// ── SKALE Base Sepolia chain definition ───────────────────────────────────────
// chainId 324705682 = 0x135A9D92 (matches header.tsx)
export const skaleBaseSepolia: Chain = {
  id: 324705682,
  name: "SKALE Base Sepolia Testnet",
  nativeCurrency: { name: "SKALE Credits", symbol: "CREDIT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha"],
    },
  },
  blockExplorers: {
    default: {
      name: "SKALE Explorer",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com",
    },
  },
} as const;

// ── USDC on SKALE Base Sepolia ────────────────────────────────────────────────
// IMPORTANT: This is NOT the Ethereum Sepolia USDC address.
// SKALE has its own bridged USDC deployment. This must match
// USDC_CONTRACT in server/tool/x402_settlement.py.
//
// To find the correct address:
//   1. Check https://base-sepolia-testnet-explorer.skalenodes.com for USDC token
//   2. Or ask the SKALE team / check their docs for the canonical USDC address
//   3. Update BOTH this constant AND server/tool/x402_settlement.py to match
//
// Common SKALE Hub USDC address (verify against your specific SKALE chain):
const USDC_CONTRACT_ADDRESS: Address = "0x5425890298aed601595a70AB815c96711a31Bc65";

// Minimal ERC-20 ABI — only what we need
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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
  | "switching_network"
  | "generating"
  | "funding"
  | "confirming"
  | "verifying"
  | "saving"
  | "ready"
  | "error";

// ── XOR encryption (mirrors server/tool/x402_settlement.py _decrypt_burner_key) ─
function encryptPrivateKey(privateKey: string, ownerAddress: string): string {
  const keyHex = keccak256(toBytes(ownerAddress.toLowerCase()));
  const pkBytes = toBytes(privateKey as `0x${string}`);
  const keyBytes = toBytes(keyHex);
  const encrypted = pkBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return toHex(new Uint8Array(encrypted));
}

// ── Switch MetaMask to SKALE network ─────────────────────────────────────────
async function switchToSkale(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const requiredChainId = "0x" + skaleBaseSepolia.id.toString(16).toUpperCase();

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: requiredChainId }],
    });
  } catch (switchError: any) {
    // 4902 = chain not added yet
    if (switchError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: requiredChainId,
            chainName: skaleBaseSepolia.name,
            rpcUrls: [skaleBaseSepolia.rpcUrls.default.http[0]],
            nativeCurrency: skaleBaseSepolia.nativeCurrency,
            blockExplorerUrls: [skaleBaseSepolia.blockExplorers?.default.url],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
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
        // ── Step 1: Switch MetaMask to SKALE ────────────────────────────────
        setStatus("switching_network");
        await switchToSkale();

        // ── Step 2: Generate burner EOA ──────────────────────────────────────
        setStatus("generating");
        const burnerPrivateKey = generatePrivateKey();
        const burnerAccount = privateKeyToAccount(burnerPrivateKey);
        const burnerAddress = burnerAccount.address;

        console.log("[BurnerWallet] Generated burner address:", burnerAddress);

        // ── Step 3: Create wallet client connected to SKALE ──────────────────
        const walletClient = createWalletClient({
          chain: skaleBaseSepolia,
          transport: custom(window.ethereum),
        });

        // publicClient uses HTTP directly — no MetaMask needed for reads
        const publicClient = createPublicClient({
          chain: skaleBaseSepolia,
          transport: http(skaleBaseSepolia.rpcUrls.default.http[0]),
        });

        const [ownerEoa] = await walletClient.requestAddresses();
        console.log("[BurnerWallet] Owner EOA:", ownerEoa);

        // ── Step 4: Check owner's USDC balance on SKALE ──────────────────────
        setStatus("funding");
        const ownerUsdcBalance = await publicClient.readContract({
          address: USDC_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [ownerEoa],
        });

        const requiredAtomic = parseUnits(fundAmountUsdc.toString(), 6);
        console.log(
          "[BurnerWallet] Owner USDC balance (atomic):",
          ownerUsdcBalance.toString(),
          "Required:",
          requiredAtomic.toString()
        );

        if (ownerUsdcBalance < requiredAtomic) {
          const ownerBalanceFormatted = (Number(ownerUsdcBalance) / 1e6).toFixed(2);
          throw new Error(
            `Insufficient USDC on SKALE. You have $${ownerBalanceFormatted} USDC on SKALE Base Sepolia ` +
            `but need $${fundAmountUsdc.toFixed(2)}. ` +
            `Please bridge USDC to SKALE Base Sepolia first.`
          );
        }

        // ── Step 5: Send USDC transfer to burner on SKALE ────────────────────
        console.log(
          `[BurnerWallet] Sending $${fundAmountUsdc} USDC to burner on SKALE...`
        );

        const txHash = await walletClient.writeContract({
          address: USDC_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [burnerAddress, requiredAtomic],
          account: ownerEoa,
          chain: skaleBaseSepolia,
        });

        console.log("[BurnerWallet] Transfer tx submitted:", txHash);

        // ── Step 6: Wait for confirmation ────────────────────────────────────
        setStatus("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 60_000, // 60 seconds
        });

        if (receipt.status !== "success") {
          throw new Error(
            "USDC transfer transaction was reverted. Check the SKALE explorer for details."
          );
        }

        console.log("[BurnerWallet] Transfer confirmed in block:", receipt.blockNumber);

        // ── Step 7: Verify burner received the USDC ──────────────────────────
        setStatus("verifying");
        const burnerBalance = await publicClient.readContract({
          address: USDC_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [burnerAddress],
        });

        const burnerBalanceUsd = Number(burnerBalance) / 1e6;
        console.log(
          "[BurnerWallet] Burner USDC balance after transfer: $" +
          burnerBalanceUsd.toFixed(6)
        );

        if (burnerBalance === 0n) {
          throw new Error(
            "Transfer appeared to succeed but burner USDC balance is 0. " +
            `Check that USDC contract ${USDC_CONTRACT_ADDRESS} is correct for SKALE Base Sepolia.`
          );
        }

        // ── Step 8: Save to backend ───────────────────────────────────────────
        setStatus("saving");
        const expiresAt = new Date(
          Date.now() + sessionDurationHours * 60 * 60 * 1000
        );
        const encryptedKey = encryptPrivateKey(burnerPrivateKey, ownerEoa);

        const savePayload = {
          smartWalletAddress:         burnerAddress,
          sessionKeyPublic:           burnerAddress,
          sessionKeyEncryptedPrivate: encryptedKey,
          spendLimitUsdc:             burnerBalanceUsd, // Use actual on-chain balance
          expiresAt:                  expiresAt.toISOString(),
          ownerEoa:                   ownerEoa,
        };

        const res = await fetch("/api/wallet/session-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savePayload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            `Failed to save burner wallet to backend: ${errData.error || res.statusText}`
          );
        }

        const info: BurnerWalletInfo = {
          burnerAddress,
          ownerEoa,
          fundedAmount: burnerBalanceUsd,
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
          burnerAddress: data.data.smartWalletAddress as Address,
          ownerEoa:      data.data.ownerEoa as Address,
          fundedAmount:  parseFloat(data.data.spendLimitUsdc),
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