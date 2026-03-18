"use client";

/**
 * components/header.tsx — Cart Blanche top navigation with Stacks Wallet
 *
 * Uses @stacks/connect connect() instead of window.ethereum.
 */

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { LogOut, User, ChevronDown, Loader2, Wallet } from "lucide-react";
import { connect } from "@stacks/connect";

// ── Helper: extract Stacks testnet address from connect() result ───────────────
function extractStacksAddress(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r         = result as Record<string, unknown>;
  const addresses = r.addresses;
  if (!addresses) return null;

  if (Array.isArray(addresses)) {
    const entry = (addresses as Array<{ address?: string; symbol?: string }>).find(
      (a) => typeof a.address === "string" && a.address.startsWith("ST")
    );
    return entry?.address ?? null;
  }

  if (typeof addresses === "object") {
    const addr = addresses as Record<string, unknown>;
    if (Array.isArray(addr.stx)) {
      const entry = (addr.stx as Array<{ address?: string }>).find(
        (a) => typeof a.address === "string" && a.address.startsWith("ST")
      );
      return entry?.address ?? null;
    }
    if (addr.stx && typeof addr.stx === "object") {
      const stx = addr.stx as Record<string, unknown>;
      if (typeof stx.testnet === "string" && stx.testnet.startsWith("ST")) {
        return stx.testnet;
      }
      if (stx.testnet && typeof stx.testnet === "object") {
        const t = stx.testnet as { address?: string };
        if (typeof t.address === "string" && t.address.startsWith("ST")) {
          return t.address;
        }
      }
    }
  }
  return null;
}

export default function Header() {
  const { data: session, status } = useSession();
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Stacks wallet state
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const connectStacksWallet = useCallback(() => {
    connect()
      .then((result) => {
        const addr = extractStacksAddress(result);
        if (addr) setStacksAddress(addr);
      })
      .catch((err) => {
        console.error("[Header] connect() error:", err);
      });
  }, []);

  const disconnectStacksWallet = useCallback(() => {
    setStacksAddress(null);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">

        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="/Gemini_Generated_Image_arlivbarlivbarli-removebg-preview.png"
            alt="Cart Logo"
            className="h-8 w-8 object-contain drop-shadow-[0_0_6px_#ffe95c80]"
            style={{ maxHeight: "2rem" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="font-bold text-lg text-[#ffe95c] drop-shadow-[0_0_6px_#ffe95c80] tracking-wide">
            Cart Blanche
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {/* Stacks wallet chip */}
          {stacksAddress ? (
            <div
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                borderRadius: 9999,
                background:   "rgba(255,233,92,0.1)",
                padding:      "6px 14px",
                fontSize:     13,
                color:        "#ffe95c",
                border:       "1px solid rgba(255,233,92,0.25)",
                fontFamily:   "monospace",
                boxShadow:    "0 0 8px rgba(255,233,92,0.25)",
                cursor:       "pointer",
              }}
              onClick={disconnectStacksWallet}
              title="Click to disconnect Stacks wallet"
            >
              <Wallet size={12} />
              {`${stacksAddress.slice(0, 8)}…${stacksAddress.slice(-4)}`}
            </div>
          ) : (
            <button
              onClick={connectStacksWallet}
              style={{
                borderRadius: 9999,
                background:   "#ffe95c",
                padding:      "6px 16px",
                fontSize:     13,
                fontWeight:   600,
                color:        "#000",
                border:       "1px solid rgba(255,233,92,0.4)",
                cursor:       "pointer",
                boxShadow:    "0 0 12px rgba(255,233,92,0.5)",
                transition:   "all 0.2s",
                display:      "flex",
                alignItems:   "center",
                gap:          6,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fff7b2";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#ffe95c";
              }}
            >
              <Wallet size={13} />
              Connect Leather / Xverse
            </button>
          )}

          {/* Auth */}
          {status === "loading" ? (
            <Loader2
              size={16}
              color="#4a5568"
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : session ? (
            /* Signed-in dropdown */
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  padding:      "5px 12px 5px 6px",
                  background:   "rgba(255,255,255,0.05)",
                  border:       "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9999,
                  cursor:       "pointer",
                  color:        "#e2e8f0",
                  transition:   "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                }}
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="avatar"
                    style={{
                      width:        26,
                      height:       26,
                      borderRadius: "50%",
                      objectFit:    "cover",
                      border:       "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width:          26,
                      height:         26,
                      borderRadius:   "50%",
                      background:     "hsl(66,100%,50%,0.2)",
                      border:         "1px solid hsl(66,100%,50%,0.4)",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={13} color="hsl(66,100%,50%)" />
                  </div>
                )}
                <span
                  style={{
                    fontSize:     13,
                    fontWeight:   500,
                    maxWidth:     120,
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                  }}
                >
                  {session.user?.name?.split(" ")[0] ?? "Account"}
                </span>
                <ChevronDown
                  size={13}
                  color="#4a5568"
                  style={{
                    transform:  dropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position:     "absolute",
                    top:          "calc(100% + 8px)",
                    right:        0,
                    background:   "#0d1117",
                    border:       "1px solid #1a2332",
                    borderRadius: 12,
                    padding:      8,
                    minWidth:     200,
                    boxShadow:    "0 16px 40px rgba(0,0,0,0.5)",
                    zIndex:       100,
                  }}
                >
                  <div
                    style={{
                      padding:      "10px 12px",
                      borderBottom: "1px solid #1a2332",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
                      {session.user?.name}
                    </div>
                    <div
                      style={{
                        fontSize:     11,
                        color:        "#4a5568",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                      }}
                    >
                      {session.user?.email}
                    </div>
                  </div>
                  {[
                    { label: "Chat",     href: "/chat"     },
                    { label: "Wallet",   href: "/wallet"   },
                    { label: "Settings", href: "/settings" },
                  ].map(({ label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display:      "block",
                        padding:      "8px 12px",
                        borderRadius: 8,
                        fontSize:     13,
                        color:        "#94a3b8",
                        textDecoration: "none",
                        transition:   "all 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "#1a2332";
                        el.style.color      = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "transparent";
                        el.style.color      = "#94a3b8";
                      }}
                    >
                      {label}
                    </Link>
                  ))}
                  <div style={{ height: 1, background: "#1a2332", margin: "6px 0" }} />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    style={{
                      width:        "100%",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          8,
                      padding:      "8px 12px",
                      background:   "transparent",
                      border:       "none",
                      borderRadius: 8,
                      fontSize:     13,
                      color:        "#ef4444",
                      cursor:       "pointer",
                      textAlign:    "left",
                      fontFamily:   "inherit",
                      transition:   "all 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#ef444415";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not signed in */
            <button
              onClick={() => signIn("google", { callbackUrl: "/chat" })}
              style={{
                padding:      "7px 18px",
                background:   "hsl(66,100%,50%,0.1)",
                border:       "1px solid hsl(66,100%,50%,0.3)",
                borderRadius: 9999,
                fontSize:     13,
                fontWeight:   600,
                color:        "hsl(66,100%,50%)",
                cursor:       "pointer",
                fontFamily:   "inherit",
                transition:   "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(66,100%,50%,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(66,100%,50%,0.1)";
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </header>
  );
}