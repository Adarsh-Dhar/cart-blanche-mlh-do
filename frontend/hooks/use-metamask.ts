import { useState, useCallback } from 'react';
import { createWalletClient, custom, parseUnits, isAddress } from 'viem';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
}

interface WalletClient {
  account: `0x${string}`;
  client: ReturnType<typeof createWalletClient>;
}

const skaleBaseSepolia = {
  id: 324705682,
  name: 'SKALE Base Sepolia Testnet',
  network: 'skale-base-sepolia',
  nativeCurrency: { name: 'SKALE Credits', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha'] },
  },
  blockExplorers: {
    default: { name: 'SKALE Explorer', url: 'https://base-sepolia-testnet-explorer.skalenodes.com' },
  },
} as const;

function makeWalletClient() {
  if (!window.ethereum) throw new Error('MetaMask is not installed.');
  return createWalletClient({
    chain: skaleBaseSepolia,
    transport: custom(window.ethereum as EthereumProvider),
  });
}

/**
 * Convert a dollar amount (float) to USDC base units (6 decimals).
 * EIP-712 uint256 CANNOT be a float — MetaMask rejects it hard.
 * e.g. 798.50 → 798500000n
 */
function toUSDCUnits(amount: number): bigint {
  return parseUnits(amount.toFixed(6), 6);
}

/**
 * Validate an Ethereum address. The backend may send placeholder strings like
 * "0xPremiumVendorAddress712..." which aren't real addresses.
 * Falls back to zero address so MetaMask at least opens (user can see the problem).
 */
function sanitizeAddress(addr: string): `0x${string}` {
  if (typeof addr === 'string' && isAddress(addr)) {
    return addr as `0x${string}`;
  }
  console.warn('[signMandate] Invalid merchant_address:', addr, '→ using zero address fallback');
  return '0x0000000000000000000000000000000000000000';
}

export function useMetaMask() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (): Promise<WalletClient> => {
    if (!window.ethereum) throw new Error('MetaMask is not installed.');
    const client = makeWalletClient();
    const [account] = await client.requestAddresses();
    if (!account) throw new Error('Failed to retrieve account address.');
    setAddress(account);
    setIsConnected(true);
    return { client, account };
  }, []);

  const signMandate = useCallback(
    async (payload: any) => {
      let currentAddress = address;
      let currentClient: ReturnType<typeof createWalletClient>;

      if (!currentAddress) {
        const connection = await connect();
        currentAddress = connection.account;
        currentClient = connection.client;
      } else {
        currentClient = makeWalletClient();
      }

      // Remove EIP712Domain — viem generates it from domain automatically.
      // Passing it manually (especially without verifyingContract) causes a crash.
      const sanitizedTypes = { ...payload.types };
      delete sanitizedTypes.EIP712Domain;

      const sanitizedDomain = { ...payload.domain };
      if (!sanitizedDomain.verifyingContract) {
        delete sanitizedDomain.verifyingContract;
      }

      // Fix message values so they satisfy EIP-712 type constraints:
      //   • amount (uint256) must be a bigint, NOT a JS float
      //   • merchant_address must be a valid 0x address
      const fixedMessage: Record<string, unknown> = { ...payload.message };

      if (fixedMessage.amount !== undefined) {
        fixedMessage.amount = toUSDCUnits(Number(fixedMessage.amount));
      }

      if (typeof fixedMessage.merchant_address === 'string') {
        fixedMessage.merchant_address = sanitizeAddress(fixedMessage.merchant_address);
      }

      const typedData = {
        domain: sanitizedDomain,
        types: sanitizedTypes,
        primaryType: 'CartMandate' as const,
        message: fixedMessage,
      };

      console.log(
        '[signMandate] Signing:',
        JSON.stringify(typedData, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
      );

      const signature = await currentClient.signTypedData({
        account: currentAddress,
        ...typedData,
      });

      console.log('[signMandate] Signature:', signature);
      return signature;
    },
    [address, connect]
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!address) throw new Error('No connected address. Please connect first.');
      const client = makeWalletClient();
      return client.signMessage({ account: address, message });
    },
    [address]
  );

  return { connect, signMandate, signMessage, address, isConnected };
}