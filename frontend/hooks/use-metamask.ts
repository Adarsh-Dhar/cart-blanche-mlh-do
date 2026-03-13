// Add TypeScript declaration for window.ethereum
import { useState, useCallback } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// Define the EthereumProvider type
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
}

interface WalletClient {
  account: `0x${string}`;
  client: ReturnType<typeof createWalletClient>;
}

export function useMetaMask() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (): Promise<WalletClient> => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }
    const client = createWalletClient({
      chain: sepolia, // Assuming Sepolia from your chainId 11155111
      transport: custom(window.ethereum as EthereumProvider),
    });
    const [account] = await client.requestAddresses();
    if (!account) {
      throw new Error("Failed to retrieve account address.");
    }
    setAddress(account);
    setIsConnected(true);
    return { client, account };
  }, []);

  const signMandate = useCallback(
    async (payload: any) => {
      let currentAddress = address;
      let currentClient;

      if (!currentAddress) {
        const connection = await connect();
        currentAddress = connection.account;
        currentClient = connection.client;
      } else {
        currentClient = createWalletClient({
          chain: sepolia,
          transport: custom(window.ethereum as EthereumProvider),
        });
      }

      // viem requires primaryType to be explicitly stated
      const typedData = {
        domain: payload.domain,
        types: payload.types,
        primaryType: 'CartMandate',
        message: payload.message,
      };

      const signature = await currentClient.signTypedData({
        account: currentAddress,
        ...typedData,
      });

      return signature;
    },
    [address, connect]
  );

  const signMessage = useCallback(
    async (message: string) => {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      const client = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum as EthereumProvider),
      });

      if (!address) {
        throw new Error("No connected address. Please connect first.");
      }

      const signature = await client.signMessage({
        account: address,
        message,
      });

      return signature;
    },
    [address]
  );

  return { connect, signMandate, signMessage, address, isConnected };
}
