/**
 * lib/stacks-config.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all Stacks contract addresses.
 *
 * PREVIOUSLY the deployer address was duplicated across files with different
 * fallbacks, which caused the mint page and wallet page to query different
 * contracts and show different balances:
 *
 *   mint/page.tsx     DEPLOYER = "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4"
 *   useBurnerwallet   fallback = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"  ← WRONG
 *
 * Now every file imports from here.
 */

/** The wallet that deployed the USDCx contracts on Stacks Testnet. */
export const STACKS_DEPLOYER = "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4";

export const USDCX_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_USDCX_CONTRACT_ADDRESS ?? STACKS_DEPLOYER;

export const USDCX_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_USDCX_CONTRACT_NAME ?? "usdcx-token";

/** Asset name as defined in Clarity: (define-fungible-token usdcx-token) */
export const USDCX_ASSET_NAME = "usdcx-token";

/** 6 decimal places — 1 USDCx = 1_000_000 atomic units */
export const USDCX_DECIMALS = 6;

export const SBTC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT_ADDRESS ?? STACKS_DEPLOYER;

export const SBTC_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT_NAME ?? "sbtc-token";

export const SBTC_ASSET_NAME = "sbtc-token";
export const SBTC_DECIMALS   = 8;

/** Hiro Stacks Testnet API base URL */
export const HIRO_TESTNET_API = "https://api.testnet.hiro.so";

/**
 * Fetch the USDCx (or sBTC) balance of any Stacks principal.
 * Uses the Hiro extended /balances endpoint which returns all FT balances
 * in a map keyed by "{contractAddress}.{contractName}::{assetName}".
 *
 * Tries exact keys first, then a prefix fuzzy match as a fallback.
 */
export async function fetchTokenBalance(
  principal:       string,
  contractAddress: string = USDCX_CONTRACT_ADDRESS,
  contractName:    string = USDCX_CONTRACT_NAME,
  assetName:       string = USDCX_ASSET_NAME,
  decimals:        number = USDCX_DECIMALS,
): Promise<number> {
  const url = `${HIRO_TESTNET_API}/extended/v1/address/${encodeURIComponent(principal)}/balances`;

  let data: Record<string, unknown>;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[fetchTokenBalance] HTTP ${res.status} for ${principal}`);
      return 0;
    }
    data = await res.json();
  } catch (e) {
    console.error("[fetchTokenBalance] Network error:", e);
    return 0;
  }

  const fts = (data?.fungible_tokens ?? {}) as Record<string, { balance: string }>;

  console.log(
    `[fetchTokenBalance] ${principal.slice(0, 16)}… → keys:`,
    Object.keys(fts),
  );

  // Exact key candidates in priority order.
  // The Hiro API key format is:  {address}.{contract}::{assetName}
  const candidates = [
    `${contractAddress}.${contractName}::${assetName}`,
    `${contractAddress}.${contractName}::${contractName}`, // same if assetName === contractName
    `${contractAddress}.${contractName}`,
  ];

  for (const key of candidates) {
    if (fts[key]) {
      const raw = Number(BigInt(fts[key].balance)) / Math.pow(10, decimals);
      console.log(`[fetchTokenBalance] ✓ matched key "${key}" → ${raw}`);
      return raw;
    }
  }

  // Fuzzy fallback: any key that starts with the contract prefix
  const prefix = `${contractAddress}.${contractName}`.toLowerCase();
  for (const [key, val] of Object.entries(fts)) {
    if (key.toLowerCase().startsWith(prefix)) {
      const raw = Number(BigInt(val.balance)) / Math.pow(10, decimals);
      console.log(`[fetchTokenBalance] ✓ fuzzy key "${key}" → ${raw}`);
      return raw;
    }
  }

  console.log(`[fetchTokenBalance] No matching key for ${contractAddress}.${contractName}`);
  return 0;
}