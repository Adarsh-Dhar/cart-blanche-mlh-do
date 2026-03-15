/**
 * hooks/useSmartWallet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Powerhouse hook for the Hybrid Smart Wallet (ERC-4337) + Session Key flow.
 *
 * Responsibilities:
 *  1. Derive the counterfactual Smart Wallet address from the user's EOA
 *     (uses CREATE2 salt — no deployment needed until first UserOp).
 *  2. Generate a temporary secp256k1 Session Key pair in-browser.
 *  3. Sign the session-key registration transaction via MetaMask.
 *  4. POST the encrypted private half to the backend (/api/wallet/session-key).
 *  5. Fund the Smart Wallet — triggers a standard MetaMask `eth_sendTransaction`
 *     to move USDC from EOA → Smart Wallet contract address.
 */

"use client";

import { useState, useCallback } from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  encodeFunctionData,
  keccak256,
  toBytes,
  toHex,
  concat,
  pad,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// ── Chain config ──────────────────────────────────────────────────────────────
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

// ── Well-known addresses (replace with your deployed contracts) ───────────────
const ENTRY_POINT_ADDRESS =
  "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address; // ERC-4337 EntryPoint v0.6
const SIMPLE_ACCOUNT_FACTORY =
  "0x9406Cc6185a346906296840746125a0E44976454" as Address; // ZeroDev / SimpleAccount factory

// Minimal USDC ABI fragments
const USDC_TRANSFER_ABI = [
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

// SimpleAccountFactory ABI fragment
const FACTORY_ABI = [
  {
    name: "getAddress",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "createAccount",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Session Key validator ABI (simplified — adapt to your actual contract)
const SESSION_KEY_VALIDATOR_ABI = [
  {
    name: "enableSessionKey",
    type: "function",
    inputs: [
      { name: "sessionKey", type: "address" },
      { name: "spendLimit", type: "uint256" },
      { name: "validUntil", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SmartWalletInfo {
  smartWalletAddress: Address;
  sessionKeyPublic: Address;
  spendLimitUsdc: number;
  expiresAt: Date;
}

export interface SessionKeyRegistration {
  smartWalletAddress: Address;
  sessionKeyPublic: Address;
  sessionKeyEncryptedPrivate: string;
  spendLimitUsdc: number;
  expiresAt: string;
  ownerEoa: Address;
}

export type SmartWalletStatus =
  | "idle"
  | "deriving"
  | "generating_key"
  | "registering"
  | "funding"
  | "saving"
  | "ready"
  | "error";

// ── Simple XOR-based encryption for the session key private half ──────────────
// In production, replace with AES-256-GCM using a server-derived key.
function encryptSessionKey(privateKey: string, ownerAddress: string): string {
  const key = keccak256(toBytes(ownerAddress));
  // XOR each byte pair — good enough for demo; use proper AES in prod
  const pkBytes = toBytes(privateKey);
  const keyBytes = toBytes(key);
  const encrypted = pkBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return toHex(new Uint8Array(encrypted));
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSmartWallet() {
  const [status, setStatus] = useState<SmartWalletStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<SmartWalletInfo | null>(null);

  // ── 1. Derive Smart Wallet address (counterfactual, no deploy needed) ────
  const deriveSmartWalletAddress = useCallback(
    async (eoaAddress: Address): Promise<Address> => {
      const publicClient = createPublicClient({
        chain: skaleBaseSepolia,
        transport: http(
          skaleBaseSepolia.rpcUrls.default.http[0]
        ),
      });

      const salt = BigInt(0); // use 0 as default salt — one wallet per EOA

      try {
        const smartWalletAddress = await publicClient.readContract({
          address: SIMPLE_ACCOUNT_FACTORY,
          abi: FACTORY_ABI,
          functionName: "getAddress",
          args: [eoaAddress, salt],
        });
        return smartWalletAddress as Address;
      } catch {
        // Factory not deployed on this network — derive deterministically
        // using CREATE2 formula as fallback for local dev
        const initCodeHash = keccak256(
          concat([
            toBytes(SIMPLE_ACCOUNT_FACTORY),
            pad(toBytes(eoaAddress), { size: 32 }),
            pad(toHex(salt), { size: 32 }),
          ])
        );
        const rawAddress = keccak256(
          concat([toBytes("0xff"), toBytes(SIMPLE_ACCOUNT_FACTORY), pad(toHex(salt), { size: 32 }), toBytes(initCodeHash)])
        );
        return `0x${rawAddress.slice(-40)}` as Address;
      }
    },
    []
  );

  // ── 2. Register a Session Key on the Smart Wallet ────────────────────────
  const registerSessionKey = useCallback(
    async ({
      eoaAddress,
      walletClient,
      smartWalletAddress,
      sessionKeyPublic,
      spendLimitUsdc,
      expiresAt,
    }: {
      eoaAddress: Address;
      walletClient: WalletClient;
      smartWalletAddress: Address;
      sessionKeyPublic: Address;
      spendLimitUsdc: number;
      expiresAt: Date;
    }): Promise<`0x${string}`> => {
      const spendLimitAtomicUnits = parseUnits(
        spendLimitUsdc.toString(),
        6 // USDC decimals
      );
      const validUntil = Math.floor(expiresAt.getTime() / 1000);

      const callData = encodeFunctionData({
        abi: SESSION_KEY_VALIDATOR_ABI,
        functionName: "enableSessionKey",
        args: [sessionKeyPublic, spendLimitAtomicUnits, validUntil],
      });

      // Send the registration tx through the EOA (owner of the smart wallet)
      const txHash = await walletClient.sendTransaction({
        account: eoaAddress,
        to: smartWalletAddress,
        data: callData,
        chain: skaleBaseSepolia,
      });

      return txHash;
    },
    []
  );

  // ── 3. Fund the Smart Wallet (move USDC from EOA → Smart Wallet) ─────────
  const fundSmartWallet = useCallback(
    async ({
      eoaAddress,
      walletClient,
      smartWalletAddress,
      usdcContractAddress,
      amountUsdc,
    }: {
      eoaAddress: Address;
      walletClient: WalletClient;
      smartWalletAddress: Address;
      usdcContractAddress: Address;
      amountUsdc: number;
    }): Promise<`0x${string}`> => {
      const amount = parseUnits(amountUsdc.toString(), 6);

      const callData = encodeFunctionData({
        abi: USDC_TRANSFER_ABI,
        functionName: "transfer",
        args: [smartWalletAddress, amount],
      });

      const txHash = await walletClient.sendTransaction({
        account: eoaAddress,
        to: usdcContractAddress,
        data: callData,
        chain: skaleBaseSepolia,
      });

      return txHash;
    },
    []
  );

  // ── 4. Master "Authorize" flow: derive + generate key + register + save ──
  const authorizeShoppingAgent = useCallback(
    async ({
      spendLimitUsdc = 200,
      sessionDurationHours = 24,
      usdcContractAddress,
      fundAmountUsdc,
    }: {
      spendLimitUsdc?: number;
      sessionDurationHours?: number;
      usdcContractAddress?: Address;
      fundAmountUsdc?: number;
    } = {}): Promise<SmartWalletInfo> => {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      setStatus("deriving");
      setError(null);

      const walletClient = createWalletClient({
        chain: skaleBaseSepolia,
        transport: custom(window.ethereum),
      });

      const [eoaAddress] = await walletClient.requestAddresses();

      // 1. Derive smart wallet address
      const smartWalletAddress = await deriveSmartWalletAddress(eoaAddress);
      console.log("[SmartWallet] Smart wallet address:", smartWalletAddress);

      // 2. Generate session key
      setStatus("generating_key");
      const sessionPrivateKey = generatePrivateKey();
      const sessionAccount = privateKeyToAccount(sessionPrivateKey);
      const sessionKeyPublic = sessionAccount.address;

      console.log("[SmartWallet] Session key public:", sessionKeyPublic);

      // 3. Register session key on-chain
      setStatus("registering");
      const expiresAt = new Date(
        Date.now() + sessionDurationHours * 60 * 60 * 1000
      );

      await registerSessionKey({
        eoaAddress,
        walletClient,
        smartWalletAddress,
        sessionKeyPublic,
        spendLimitUsdc,
        expiresAt,
      });

      // 4. Fund smart wallet if requested
      if (fundAmountUsdc && fundAmountUsdc > 0 && usdcContractAddress) {
        setStatus("funding");
        await fundSmartWallet({
          eoaAddress,
          walletClient,
          smartWalletAddress,
          usdcContractAddress,
          amountUsdc: fundAmountUsdc,
        });
      }

      // 5. Encrypt private key and save to backend
      setStatus("saving");
      const encryptedPrivate = encryptSessionKey(sessionPrivateKey, eoaAddress);

      const registration: SessionKeyRegistration = {
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate: encryptedPrivate,
        spendLimitUsdc,
        expiresAt: expiresAt.toISOString(),
        ownerEoa: eoaAddress,
      };

      const res = await fetch("/api/wallet/session-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registration),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save session key to backend");
      }

      const info: SmartWalletInfo = {
        smartWalletAddress,
        sessionKeyPublic,
        spendLimitUsdc,
        expiresAt,
      };

      setWalletInfo(info);
      setStatus("ready");
      return info;
    },
    [deriveSmartWalletAddress, registerSessionKey, fundSmartWallet]
  );

  // ── 5. Check if an active session key exists for the connected wallet ────
  const checkExistingSession = useCallback(
    async (): Promise<SmartWalletInfo | null> => {
      try {
        const res = await fetch("/api/wallet/session-key");
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.data) return null;

        const info: SmartWalletInfo = {
          smartWalletAddress: data.data.smartWalletAddress,
          sessionKeyPublic: data.data.sessionKeyPublic,
          spendLimitUsdc: data.data.spendLimitUsdc,
          expiresAt: new Date(data.data.expiresAt),
        };

        if (info.expiresAt < new Date()) return null;

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
    deriveSmartWalletAddress,
    fundSmartWallet,
  };
}