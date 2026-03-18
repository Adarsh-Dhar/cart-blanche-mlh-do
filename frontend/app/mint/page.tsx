"use client";

/**
 * app/mint/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * USDCx Testnet Minting Page
 * Calls governance-mint on the deployed usdcx-token contract.
 * Deployer: ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { connect } from "@stacks/connect";
import { uintCV, standardPrincipalCV, AnchorMode, PostConditionMode } from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import {
  Coins, Zap, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ExternalLink, RefreshCw, Wallet, Bitcoin, Copy, Check,
} from "lucide-react";

// ── Contract config ───────────────────────────────────────────────────────────
const DEPLOYER = "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4";
const CONTRACT_NAME = "usdcx-token";
const DECIMALS = 6;

// ── Types ─────────────────────────────────────────────────────────────────────
type TxStatus = "idle" | "connecting" | "signing" | "success" | "error";
interface MintResult { txId: string; amount: number; recipient: string }

// ── Balance fetcher using Hiro extended API ───────────────────────────────────
// Uses the /balances endpoint — far more reliable than call-read for FTs.
// The Stacks API keys FTs as "contractAddress.contractName::assetName"
async function fetchUSDCxBalance(principal: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.testnet.hiro.so/extended/v1/address/${encodeURIComponent(principal)}/balances`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const fts: Record<string, { balance: string }> = data?.fungible_tokens ?? {};

    // Exact matches first
    const candidates = [
      `${DEPLOYER}.${CONTRACT_NAME}::usdcx-token`,
      `${DEPLOYER}.${CONTRACT_NAME}::usdcx`,
      `${DEPLOYER}.${CONTRACT_NAME}`,
    ];
    for (const key of candidates) {
      if (fts[key]) {
        return Number(BigInt(fts[key].balance)) / Math.pow(10, DECIMALS);
      }
    }
    // Fuzzy — any key starting with our contract
    for (const [key, val] of Object.entries(fts)) {
      if (key.toLowerCase().startsWith(`${DEPLOYER}.${CONTRACT_NAME}`.toLowerCase())) {
        return Number(BigInt(val.balance)) / Math.pow(10, DECIMALS);
      }
    }
    return 0;
  } catch (e) {
    console.error("[fetchUSDCxBalance]", e);
    return 0;
  }
}

const PRESETS = [100, 500, 1000, 5000];

// ── Component ─────────────────────────────────────────────────────────────────
export default function MintPage() {
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);
  const [recipientOverride, setRecipientOverride] = useState("");
  const [amount, setAmount] = useState("1000");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipient = recipientOverride.trim() || stacksAddress || "";

  // ── Connect wallet ──────────────────────────────────────────────────────────
  const connectWallet = useCallback(() => {
    setStatus("connecting");
    connect()
      .then((res) => {
        const addresses = res?.addresses;
        let addr: string | null = null;
        if (Array.isArray(addresses)) {
          const stx = addresses.find((a: any) =>
            typeof a.address === "string" && a.address.startsWith("ST")
          );
          if (stx) addr = stx.address;
        }
        if (addr) { setStacksAddress(addr); setStatus("idle"); }
        else { setError("Could not get Stacks address."); setStatus("error"); }
      })
      .catch(() => setStatus("idle"));
  }, []);

  // ── Fetch balance ───────────────────────────────────────────────────────────
  const refreshBalance = useCallback(async (who?: string) => {
    const target = who ?? (recipientOverride.trim() || stacksAddress);
    if (!target) return undefined;
    setBalanceLoading(true);
    const bal = await fetchUSDCxBalance(target);
    setBalance(bal);
    setBalanceLoading(false);
    return bal;
  }, [stacksAddress, recipientOverride]);

  // Initial load when wallet connects
  useEffect(() => {
    if (stacksAddress) refreshBalance();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stacksAddress, refreshBalance]);

  // Refresh when override changes to a valid address
  useEffect(() => {
    const t = recipientOverride.trim();
    if (t.startsWith("ST") && t.length > 30) refreshBalance(t);
  }, [recipientOverride, refreshBalance]);

  // ── Poll after mint until balance increases ─────────────────────────────────
  const startPolling = useCallback((prevBal: number, target: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setConfirming(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const newBal = await fetchUSDCxBalance(target);
      setBalance(newBal);
      if (newBal > prevBal || attempts >= 24) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setConfirming(false);
      }
    }, 5000);
  }, []);

  // ── Mint ────────────────────────────────────────────────────────────────────
  const handleMint = async () => {
    setError(null);
    setResult(null);
    if (!recipient) { setError("Please connect your wallet or enter a recipient address."); return; }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Enter a valid amount."); return; }
    const atomicAmount = Math.floor(parsedAmount * Math.pow(10, DECIMALS));
    const prevBal = balance ?? 0;
    try {
      setStatus("signing");
      const { openContractCall } = await import("@stacks/connect");
      await new Promise<void>((resolve, reject) => {
        openContractCall({
          contractAddress: DEPLOYER,
          contractName: CONTRACT_NAME,
          functionName: "governance-mint",
          functionArgs: [uintCV(atomicAmount), standardPrincipalCV(recipient)],
          network: STACKS_TESTNET,
          anchorMode: AnchorMode.Any,
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data) => {
            setStatus("success");
            setResult({ txId: data.txId, amount: parsedAmount, recipient });
            startPolling(prevBal, recipient);
            resolve();
          },
          onCancel: () => reject(new Error("Transaction cancelled.")),
        });
      });
    } catch (err: any) {
      setError(err.message || "Transaction failed.");
      setStatus("error");
    }
  };

  const copyAddress = () => {
    if (stacksAddress) {
      navigator.clipboard.writeText(stacksAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = status === "connecting" || status === "signing";
  const parsedAmt = parseFloat(amount);
  const atomicDisplay = !isNaN(parsedAmt) && parsedAmt > 0
    ? (parsedAmt * Math.pow(10, DECIMALS)).toLocaleString()
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#080a06", color: "#e2e8f0",
      fontFamily: "'Syne', sans-serif", padding: "40px 24px 80px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "fixed", top: "-10%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, hsl(66,100%,50%,0.06), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-15%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, hsl(180,100%,60%,0.04), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40, fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "hsl(66,100%,50%)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >Cart Blanche</Link>
          <span>/</span>
          <span style={{ color: "hsl(66,100%,50%)" }}>mint</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, border: "1px solid hsl(66,100%,50%,0.3)", background: "hsl(66,100%,50%,0.08)", color: "hsl(66,100%,50%)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 20 }}>
            <Coins size={12} /> USDCx Testnet Faucet
          </div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Mint{" "}<span style={{ color: "hsl(66,100%,50%)", textShadow: "0 0 30px hsl(66,100%,50%,0.4)" }}>USDCx</span>{" "}tokens
          </h1>
          <p style={{ color: "#4a5568", fontSize: 14, marginTop: 12, lineHeight: 1.7, maxWidth: 480 }}>
            Mint testnet USDCx tokens to fund your Smart Wallet for agentic shopping. Requires the deployer wallet.
          </p>
        </div>

        {/* Contract info */}
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "hsl(66,100%,50%,0.1)", border: "1px solid hsl(66,100%,50%,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bitcoin size={16} color="hsl(66,100%,50%)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 4 }}>Deployed Contract</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all" as const }}>
              {DEPLOYER}.{CONTRACT_NAME}
            </div>
          </div>
          <a href={`https://explorer.hiro.so/address/${DEPLOYER}.${CONTRACT_NAME}?chain=testnet`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "hsl(66,100%,50%)", textDecoration: "none", padding: "6px 12px", background: "hsl(66,100%,50%,0.08)", border: "1px solid hsl(66,100%,50%,0.2)", borderRadius: 8, flexShrink: 0 }}>
            Explorer <ExternalLink size={11} />
          </a>
        </div>

        {/* Wallet connection */}
        {!stacksAddress ? (
          <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 16, padding: 28, marginBottom: 20, textAlign: "center" as const }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "hsl(66,100%,50%,0.1)", border: "1px solid hsl(66,100%,50%,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Wallet size={22} color="hsl(66,100%,50%)" />
            </div>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Connect your Leather or Xverse wallet to mint USDCx tokens.</p>
            <button onClick={connectWallet} disabled={isLoading} style={{ padding: "13px 28px", background: "hsl(66,100%,50%)", border: "none", borderRadius: 12, color: "#000", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 0 32px hsl(66,100%,50%,0.3)" }}>
              {status === "connecting" ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <Wallet size={15} />}
              Connect Leather / Xverse
            </button>
          </div>
        ) : (
          <div style={{ background: "hsl(66,100%,50%,0.06)", border: "1px solid hsl(66,100%,50%,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
            <CheckCircle2 size={16} color="hsl(66,100%,50%)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "hsl(66,100%,50%)", fontWeight: 700, marginBottom: 2 }}>Wallet Connected</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{stacksAddress}</div>
            </div>
            <button onClick={copyAddress} style={{ background: "transparent", border: "none", color: "#4a5568", cursor: "pointer", padding: 4 }}>
              {copied ? <Check size={14} color="hsl(66,100%,50%)" /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {/* Balance */}
        {stacksAddress && (
          <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 6 }}>
                {recipientOverride.trim() ? "Recipient Balance" : "Your Balance"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "hsl(66,100%,50%)", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                {balanceLoading
                  ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 14, color: "#4a5568" }}>Loading…</span></>
                  : balance !== null
                    ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDCx`
                    : "— USDCx"
                }
              </div>
              {confirming && (
                <div style={{ fontSize: 10, color: "#4a5568", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "hsl(66,100%,50%)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  Polling for confirmation (~30s)…
                </div>
              )}
            </div>
            <button onClick={() => refreshBalance()} disabled={balanceLoading} style={{ background: "transparent", border: "1px solid #1a2332", borderRadius: 8, color: "#4a5568", cursor: "pointer", padding: 8, display: "flex", alignItems: "center" }}>
              <RefreshCw size={14} style={{ animation: balanceLoading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        )}

        {/* Mint form */}
        <div style={{ background: "#0d1117", border: "1px solid hsl(66,100%,50%,0.2)", borderRadius: 16, padding: 28, boxShadow: "0 0 60px hsl(66,100%,50%,0.04)", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <Coins size={12} /> Mint Configuration
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 10 }}>Amount (USDCx)</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" as const }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => setAmount(String(p))} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: amount === String(p) ? "hsl(66,100%,50%,0.15)" : "#080c10", border: `1px solid ${amount === String(p) ? "hsl(66,100%,50%,0.5)" : "#1a2332"}`, color: amount === String(p) ? "hsl(66,100%,50%)" : "#64748b", cursor: "pointer" }}>
                  {p.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4a5568", fontSize: 14, fontWeight: 600 }}>$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="1" placeholder="1000"
                style={{ width: "100%", padding: "13px 14px 13px 30px", background: "#080c10", border: "1px solid #1a2332", borderRadius: 12, color: "#e2e8f0", fontSize: 16, fontFamily: "'Syne', sans-serif", outline: "none", boxSizing: "border-box" as const }}
                onFocus={e => (e.target.style.borderColor = "hsl(66,100%,50%,0.5)")}
                onBlur={e => (e.target.style.borderColor = "#1a2332")}
              />
            </div>
            {atomicDisplay && <div style={{ fontSize: 11, color: "#4a5568", marginTop: 6, fontFamily: "monospace" }}>= {atomicDisplay} atomic units (6 decimals)</div>}
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: "#4a5568", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8 }}>
              Recipient Address{" "}
              <span style={{ fontStyle: "normal", color: "#2d3748", textTransform: "none" as const, letterSpacing: 0, fontSize: 10 }}>(optional — defaults to connected wallet)</span>
            </label>
            <input type="text" value={recipientOverride} onChange={e => setRecipientOverride(e.target.value)}
              placeholder={stacksAddress || "ST... (Stacks testnet address)"}
              style={{ width: "100%", padding: "13px 14px", background: "#080c10", border: "1px solid #1a2332", borderRadius: 12, color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" as const }}
              onFocus={e => (e.target.style.borderColor = "hsl(66,100%,50%,0.5)")}
              onBlur={e => (e.target.style.borderColor = "#1a2332")}
            />
            {recipient && <div style={{ fontSize: 11, color: "#4a5568", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", display: "inline-block" }} />
              Minting to: <span style={{ fontFamily: "monospace", color: "#94a3b8", marginLeft: 4 }}>{recipient.slice(0, 24)}…</span>
            </div>}
          </div>

          {/* Error */}
          {(status === "error" || error) && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#ef444410", border: "1px solid #ef444430", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>{error || "Transaction failed."}</span>
            </div>
          )}

          {/* Button */}
          <button onClick={handleMint} disabled={isLoading || !stacksAddress} style={{ width: "100%", padding: "16px 24px", background: isLoading || !stacksAddress ? "#1a2332" : "hsl(66,100%,50%)", border: "none", borderRadius: 12, color: isLoading || !stacksAddress ? "#4a5568" : "#000", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: isLoading || !stacksAddress ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: isLoading || !stacksAddress ? "none" : "0 0 32px hsl(66,100%,50%,0.3)", transition: "all 0.2s" }}>
            {isLoading
              ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />{status === "connecting" ? "Connecting…" : "Waiting for signature…"}</>
              : <><Zap size={16} />Mint {parsedAmt > 0 ? `${parsedAmt.toLocaleString()} ` : ""}USDCx<ArrowRight size={14} /></>
            }
          </button>
          {!stacksAddress && <p style={{ textAlign: "center" as const, fontSize: 11, color: "#2d3748", marginTop: 12 }}>Connect your wallet above to enable minting</p>}
        </div>

        {/* Success */}
        {status === "success" && result && (
          <div style={{ background: "hsl(66,100%,50%,0.06)", border: "1px solid hsl(66,100%,50%,0.3)", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 0 40px hsl(66,100%,50%,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "hsl(66,100%,50%,0.15)", border: "1px solid hsl(66,100%,50%,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={20} color="hsl(66,100%,50%)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "hsl(66,100%,50%)" }}>{result.amount.toLocaleString()} USDCx minted!</div>
                <div style={{ fontSize: 11, color: "#4a5568", marginTop: 2 }}>Transaction submitted · balance updates once confirmed (~30s)</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {[{ label: "Transaction ID", value: result.txId }, { label: "Recipient", value: result.recipient }].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#080c10", borderRadius: 8, border: "1px solid #1a2332", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "#4a5568", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <a href={`https://explorer.hiro.so/txid/${result.txId}?chain=testnet`} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "hsl(66,100%,50%,0.1)", border: "1px solid hsl(66,100%,50%,0.3)", borderRadius: 10, color: "hsl(66,100%,50%)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                View on Explorer <ExternalLink size={12} />
              </a>
              <Link href="/wallet" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "#080c10", border: "1px solid #1a2332", borderRadius: 10, color: "#94a3b8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                Go to Wallet <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 16 }}>About USDCx</div>
          {[
            { icon: Coins, title: "SIP-010 Fungible Token", desc: "USDCx is a Stacks-native bridged USDC with 6 decimal precision, deployed on Stacks Testnet." },
            { icon: Zap, title: "governance-mint Function", desc: "Only the deployer wallet can call governance-mint. This is a testnet-only convenience function for seeding wallets." },
            { icon: Wallet, title: "Powering Cart Blanche", desc: "USDCx is used by the shopping agent to settle purchases autonomously via SIP-010 contract calls on Stacks." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #1a2332" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "hsl(66,100%,50%,0.08)", border: "1px solid hsl(66,100%,50%,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={14} color="hsl(66,100%,50%)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{title}</div>
                <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4, lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "#1a233240", borderRadius: 8, fontSize: 11, color: "#4a5568", lineHeight: 1.6 }}>
            <strong style={{ color: "#64748b" }}>Testnet only:</strong> USDCx on Stacks Testnet has no real monetary value. Use it freely for testing Cart Blanche.
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
    </div>
  );
}