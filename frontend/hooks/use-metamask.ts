// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { useState, useCallback } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';

export function useMetaMask() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error("MetaMask is not installed.");
    }
    const client = createWalletClient({
      chain: sepolia, // Assuming Sepolia from your chainId 11155111
      transport: custom(window.ethereum)
    });
    const [account] = await client.requestAddresses();
    setAddress(account);
    return { client, account };
  }, []);

  const signMandate = useCallback(async (payload: any) => {
    let currentAddress = address;
    let currentClient;
    
    if (!currentAddress) {
       const connection = await connect();
       currentAddress = connection.account;
       currentClient = connection.client;
    } else {
        currentClient = createWalletClient({
            chain: sepolia,
            transport: custom(window.ethereum)
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
        ...typedData
    });

    return signature;
  }, [address, connect]);

  return { connect, signMandate, address };
}
