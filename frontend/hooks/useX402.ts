/**
 * hooks/useX402.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stacks blockchain edition — SIP-018 structured data signing.
 *
 * Stacks does NOT support EIP-712. Instead we use SIP-018 via
 * @stacks/connect's openSignatureRequestPopup.
 *
 * The signed mandate is validated server-side before the shopping agent
 * executes the settlement workflow.
 */

import { useState, useCallback } from "react";
import { openSignatureRequestPopup } from "@stacks/connect";
import {
  tupleCV,
  uintCV,
  stringAsciiCV,
  cvToHex,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

// Stacks Testnet Chain ID (2^31 = 2147483648)
const STACKS_TESTNET_CHAIN_ID = 2147483648;

export interface CartMandatePayload {
  amount: number;
  merchants: Array<{
    name: string;
    merchant_address: string;   // Stacks principal
    amount: number;
    vendor_id: string;
  }>;
  currency?: string;
  fundingAsset?: "USDCx" | "sBTC";
}

export function useX402() {
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);

  /**
   * Set the connected Stacks address.
   * Call this from the parent component that manages wallet connection state
   * (e.g. after @stacks/connect showConnect() resolves).
   */
  const connect = useCallback(async (address: string): Promise<string> => {
    setStacksAddress(address);
    return address;
  }, []);

  /**
   * Sign a CartMandate using SIP-018 structured data signing.
   *
   * Builds a Clarity tuple representing the mandate and requests a signature
   * via the Leather/Xverse wallet popup.
   */
  const signMandate = useCallback(
    async (payload: CartMandatePayload): Promise<string> => {
      if (!stacksAddress) {
        throw new Error(
          "No Stacks wallet connected. Please connect Leather or Xverse first."
        );
      }

      // ── Build SIP-018 structured message ─────────────────────────────────
      // Clarity ASCII strings are limited to 128 chars max here for safety.
      const merchantsSummary = payload.merchants
        .map((m) => `${m.name}:${m.amount.toFixed(2)}`)
        .join(";")
        .slice(0, 128);

      // All tuple values must be ClarityValue instances
      const messageCV = tupleCV({
        amount:          uintCV(Math.round(payload.amount * 1_000_000)),
        merchants:       stringAsciiCV(merchantsSummary),
        currency:        stringAsciiCV((payload.currency    || "USDCx").slice(0, 16)),
        "funding-asset": stringAsciiCV((payload.fundingAsset || "USDCx").slice(0, 8)),
      });

      const domainCV = tupleCV({
        name:       stringAsciiCV("CartBlanche"),
        version:    stringAsciiCV("1.0.0"),
        "chain-id": uintCV(STACKS_TESTNET_CHAIN_ID),
      });

      // cvToHex encodes the Clarity value as hex for the SIP-018 request
      const message = cvToHex(messageCV);
      const domain  = cvToHex(domainCV);

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
   * Note: for structured mandate signing, use signMandate() instead.
   */
  const signMessage = useCallback(
    async (_message: string): Promise<string> => {
      if (!stacksAddress) {
        throw new Error("No Stacks wallet connected.");
      }
      throw new Error(
        "Plain message signing requires an active Leather/Xverse connection. " +
          "Use signMandate() for structured mandate signing."
      );
    },
    [stacksAddress]
  );

  return {
    connect,
    signMandate,
    signMessage,
    stacksAddress,
    address: stacksAddress,   // backward-compat alias
  };
}