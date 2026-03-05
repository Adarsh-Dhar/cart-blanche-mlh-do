import { useState, useCallback } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';

export function useX402() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error("MetaMask is not installed.");
    }
      const client = createWalletClient({
        chain: {
          id: 324705682,
          name: 'SKALE Base Sepolia',
          network: 'skale-base-sepolia',
          nativeCurrency: {
            name: 'SKALE',
            symbol: 'SKALE',
            decimals: 18
          },
          rpcUrls: {
            default: {
              http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha']
            }
          }
        }, // SKALE Base Sepolia chain
      transport: custom(window.ethereum)
    });
    const [account] = await client.requestAddresses();
    setAddress(account);
    return { client, account };
  }, []);

  const signMandate = useCallback(async (payload: any) => {
    let currentAddress = address;
    let currentClient;
    // Connect if not already connected
    if (!currentAddress) {
      const connection = await connect();
      currentAddress = connection.account;
      currentClient = connection.client;
    } else {
      currentClient = createWalletClient({
          chain: {
            id: 324705682,
            name: 'SKALE Base Sepolia',
            network: 'skale-base-sepolia',
            nativeCurrency: {
              name: 'SKALE',
              symbol: 'SKALE',
              decimals: 18
            },
            rpcUrls: {
              default: {
                http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha']
              }
            }
          },
        transport: custom(window.ethereum)
      });
    }


    // 🚨 FIX: Strip EIP712Domain from types. Viem generates this automatically based on the domain object.
    // Leaving it in causes the viem toLowerCase() crash because of the deleted verifyingContract.
    const sanitizedDomain = { ...payload.domain };
    if (sanitizedDomain.verifyingContract) {
      delete sanitizedDomain.verifyingContract;
    }

    const sanitizedTypes = { ...payload.types };
    if (sanitizedTypes.EIP712Domain) {
      delete sanitizedTypes.EIP712Domain;
    }

    // Dynamically determine the correct primaryType from types
    let primaryType = 'CartMandate';
    if (payload.types && typeof payload.types === 'object') {
      const typeKeys = Object.keys(sanitizedTypes);
      if (typeKeys.length > 0) {
        primaryType = typeKeys[0];
      }
    }

    const typedData = {
      domain: sanitizedDomain, // Use the sanitized domain here
      types: sanitizedTypes,   // Use the sanitized types here
      primaryType,
      message: payload.message,
    };


    // Defensive: Deep check for required EIP-712 fields before signing
    if (!typedData.domain || typeof typedData.domain !== 'object') {
      throw new Error('EIP-712 payload is missing required field: domain.');
    }
    if (!typedData.types || typeof typedData.types !== 'object') {
      throw new Error('EIP-712 payload is missing required field: types.');
    }
    if (!typedData.message || typeof typedData.message !== 'object') {
      throw new Error('EIP-712 payload is missing required field: message.');
    }
    if (!typedData.primaryType || typeof typedData.primaryType !== 'string') {
      throw new Error('EIP-712 payload is missing required field: primaryType.');
    }
    if (!typedData.types[typedData.primaryType] || !Array.isArray(typedData.types[typedData.primaryType])) {
      throw new Error(`EIP-712 types is missing definition for primaryType '${typedData.primaryType}'.`);
    }
    // Final check: ensure all fields in types[primaryType] are valid and have supported EIP-712 types
    const validEIP712Types = [
      'address', 'bool', 'bytes', 'bytes1', 'bytes2', 'bytes3', 'bytes4', 'bytes5', 'bytes6', 'bytes7', 'bytes8', 'bytes9', 'bytes10', 'bytes11', 'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16', 'bytes17', 'bytes18', 'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24', 'bytes25', 'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32', 'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256', 'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256', 'string'
    ];
    for (let i = 0; i < typedData.types[typedData.primaryType].length; i++) {
      const field = typedData.types[typedData.primaryType][i];
      if (!field || typeof field !== 'object' || typeof field.name !== 'string' || typeof field.type !== 'string') {
        throw new Error(`EIP-712 types[${typedData.primaryType}] contains an invalid field definition: ${JSON.stringify(field)}`);
      }
      // Handle custom struct types and arrays
      let normalizedType = field.type;
      let isArrayType = false;
      if (typeof normalizedType === 'string') {
        if (normalizedType.endsWith('[]')) {
          isArrayType = true;
          normalizedType = normalizedType.slice(0, -2); // Remove []
        }
        // Only lowercase primitive types, not custom struct types
        if (validEIP712Types.includes(normalizedType.toLowerCase())) {
          normalizedType = normalizedType.toLowerCase();
        } else if (typedData.types[normalizedType]) {
          // Custom struct type, leave as is
        } else {
          // Defensive: If type is not recognized, throw a clear error
          throw new Error(`EIP-712 types[${typedData.primaryType}] contains unsupported type '${field.type}' for field '${field.name}'.`);
        }
      } else {
        throw new Error(`EIP-712 types[${typedData.primaryType}] field '${field.name}' has non-string type.`);
      }
      // Restore array type if needed
      const finalType = isArrayType ? normalizedType + '[]' : normalizedType;
      typedData.types[typedData.primaryType][i] = { ...field, type: finalType };
    }

    console.log("Requesting signature for:", typedData);

    // 🚨 Trigger MetaMask popup

    // Final runtime check for all required fields before MetaMask call
    if (!currentClient) {
      throw new Error('Wallet client is not initialized.');
    }
    if (!currentAddress) {
      throw new Error('Wallet address is not initialized.');
    }
    if (!typedData.domain || !typedData.types || !typedData.primaryType || !typedData.message) {
      throw new Error('Typed data is missing required fields.');
    }

    let signature;
    try {
      signature = await currentClient.signTypedData({
        account: currentAddress,
        ...typedData
      });
    } catch (err) {
      console.error('MetaMask signTypedData error:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        throw new Error('MetaMask signTypedData failed: ' + (err as any).message);
      }
      throw err;
    }

    console.log("Signature received:", signature);
    return signature;
  }, [address, connect]);

  return { connect, signMandate, address };
}
