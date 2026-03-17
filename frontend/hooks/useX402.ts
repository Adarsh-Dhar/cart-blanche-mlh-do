/**
 * hooks/useX402.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stacks blockchain edition — replaces EIP-712 with SIP-018 structured signing.
 * 
 * Stacks does NOT support EIP-712. Instead we use SIP-018 (Structured Data
 * Signing) via @stacks/connect's openSignatureRequestPopup.
 * 
 * The signed mandate is then validated server-side before the LLM shopping
 * agent executes the settlement workflow.
 */

import { useState, useCallback } from "react";
import { openSignatureRequestPopup } from "@stacks/connect";
import {
  tupleCV,
  uintCV,
  stringAsciiCV,
  listCV,
  ClarityValue,
  cvToHex,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

// Stacks Testnet Chain ID
const STACKS_TESTNET_CHAIN_ID = 2147483648;

export interface CartMandatePayload {
  amount: number;                 // Total USDC/sBTC amount
  merchants: Array<{
    name: string;
    merchant_address: string;     // Stacks principal
    amount: number;
    vendor_id: string;
  }>;
  currency?: string;
  fundingAsset?: "USDCx" | "sBTC";
}

export function useX402() {
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);

  /**
   * Connect a Stacks wallet (Leather or Xverse).
   * In production, use @stacks/connect's showConnect() instead.
   * The address should be passed in from the parent component that manages
   * the Stacks wallet connection state.
   */
  const connect = useCallback(async (address: string) => {
    setStacksAddress(address);
    return address;
  }, []);

  /**
   * Sign a CartMandate using SIP-018 structured data signing.
   * 
   * Replaces EIP-712 signTypedData. The Leather/Xverse wallet popup will
   * display the structured mandate data for user approval.
   */
  const signMandate = useCallback(
    async (payload: CartMandatePayload): Promise<string> => {
      if (!stacksAddress) {
        throw new Error("No Stacks wallet connected. Please connect Leather or Xverse first.");
      }

      // ── Build SIP-018 structured message ───────────────────────────────────
      // Stacks uses Clarity Value types (tupleCV, uintCV, stringAsciiCV, etc.)
      // to represent typed structured data — analogous to EIP-712 types.

      // Merchants list — stringify complex objects to ASCII for SIP-018 compat
      const merchantsSummary = payload.merchants
        .map(m => `${m.name}:${m.amount}`)
        .join(";");

      const messageCV = tupleCV({
        amount: uintCV(Math.round(payload.amount * 1_000_000)), // USDC 6-decimal atomic
        merchants: stringAsciiCV(merchantsSummary.slice(0, 128)), // SIP-018 ASCII limit
        currency: stringAsciiCV((payload.currency || "USDCx").slice(0, 16)),
        "funding-asset": stringAsciiCV((payload.fundingAsset || "USDCx").slice(0, 8)),
      });
      const domainCV = tupleCV({
        name: stringAsciiCV("CartBlanche"),
        version: stringAsciiCV("1.0.0"),
        "chain-id": uintCV(STACKS_TESTNET_CHAIN_ID),
      });
      const message = cvToHex(messageCV);
      const domain = cvToHex(domainCV);

      return new Promise<string>((resolve, reject) => {
        openSignatureRequestPopup({
          message,
          network: STACKS_TESTNET,
          onFinish: (data) => {
            console.log("[SIP-018] Mandate signature received:", data.signature);
            resolve(data.signature);
          },
          onCancel: () => {
            reject(new Error("User cancelled the signature request."));
          },
        });
      });
    },
    [stacksAddress]
  );

  /**
   * Sign a plain string message using Stacks personal signing.
   */
  const signMessage = useCallback(
    async (_message: string): Promise<string> => {
      if (!stacksAddress) {
        throw new Error("No Stacks wallet connected.");
      }
      // For plain message signing, use openSignatureRequestPopup with a string message
      // In production integrate with @stacks/connect showConnect flow
      throw new Error(
        "Plain message signing requires Leather/Xverse connection. " +
        "Use signMandate for structured mandate signing."
      );
    },
    [stacksAddress]
  );

  return {
    connect,
    signMandate,
    signMessage,
    stacksAddress,
    address: stacksAddress, // backward-compat alias
  };
}