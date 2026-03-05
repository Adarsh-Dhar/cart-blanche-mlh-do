"use client";

import Link from "next/link";
import { useMetaMask } from "@/hooks/use-metamask"; // Note: Ensure you are using the correct hook (useX402 if you migrated it!)

import { Geist } from 'next/font/google';

const geist = Geist({ subsets: ['latin'] });

export default function Header() {
  const { connect, address } = useMetaMask();

  const handleConnect = async () => {
    try {
      // Check if window.ethereum is available
      if (typeof window !== 'undefined' && window.ethereum) {
        const requiredChainId = '0x135A9D92'; // 324705682 in hex (SKALE Base Sepolia)
        // Always attempt to switch to the required chain before connecting
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: requiredChainId }],
          });
        } catch (switchError: any) {
          // If the chain has not been added to MetaMask, try to add it (Error code 4902)
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: requiredChainId,
                    chainName: 'SKALE Base Sepolia Testnet',
                    rpcUrls: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha/'],
                    nativeCurrency: {
                      name: 'SKALE Credits',
                      symbol: 'CREDIT',
                      decimals: 18,
                    },
                    blockExplorerUrls: ['https://base-sepolia-testnet-explorer.skalenodes.com'],
                  },
                ],
              });
            } catch (addError) {
              console.error('Failed to add SKALE chain:', addError);
              return;
            }
          } else {
            console.error('Failed to switch chain:', switchError);
            return;
          }
        }
      }
      // Now request account connection
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          {/* Cart icon left of logo text */}
          <img
            src="/Gemini_Generated_Image_arlivbarlivbarli-removebg-preview.png"
            alt="Cart Logo"
            className="h-8 w-8 object-contain drop-shadow-[0_0_6px_#ffe95c80]"
            style={{ maxHeight: '2rem' }}
          />
          <span className="font-bold text-lg text-[#ffe95c] drop-shadow-[0_0_6px_#ffe95c80] tracking-wide">
            Cart Blanche
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {address ? (
            <div className="rounded-full bg-[#ffe95c1a] px-4 py-2 text-sm text-[#ffe95c] border border-[#ffe95c40] font-mono tracking-tight shadow-[0_0_8px_#ffe95c40]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-full bg-[#ffe95c] px-4 py-2 text-sm font-semibold text-black hover:bg-[#fff7b2] transition-all shadow-[0_0_12px_#ffe95c80] border border-[#ffe95c40]"
            >
              Connect MetaMask
            </button>
          )}
        </div>
      </div>
    </header>
  );
}