"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Clock,
  DollarSign,
  Key,
  Cpu,
} from "lucide-react";
import { useSmartWallet, type SmartWalletInfo } from "@/hooks/useSmartWallet";

// ── USDC contract on SKALE Base Sepolia (replace with actual address) ─────────
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`;

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "hsl(66,100%,50%)" : "#2d3748",
        boxShadow: active ? "0 0 8px hsl(66,100%,50%,0.8)" : "none",
        flexShrink: 0,
      }}
    />
  );
}

function Card({
  children,
  glow,
  style,
}: {
  children: React.ReactNode;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${glow ? "hsl(66,100%,50%,0.3)" : "#1a2332"}`,
        borderRadius: 16,
        padding: 24,
        boxShadow: glow ? "0 0 32px hsl(66,100%,50%,0.06)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #1a2332",
      }}
    >
      <span style={{ fontSize: 12, color: "#4a5568" }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          color: "#94a3b8",
          fontFamily: mono ? "monospace" : "inherit",
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function WalletPage() {
  const { status, walletInfo, authorizeShoppingAgent, checkExistingSession } =
    useSmartWallet();

  const [depositAmount, setDepositAmount] = useState("100");
  const [spendLimit, setSpendLimit] = useState("200");
  const [sessionHours, setSessionHours] = useState("24");
  const [existingSession, setExistingSession] =
    useState<SmartWalletInfo | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [depositOnly, setDepositOnly] = useState(false);

  useEffect(() => {
    checkExistingSession().then((s) => setExistingSession(s));
  }, [checkExistingSession]);

  const handleAuthorize = async () => {
    setActionError(null);
    try {
      const info = await authorizeShoppingAgent({
        spendLimitUsdc: parseFloat(spendLimit) || 200,
        sessionDurationHours: parseInt(sessionHours) || 24,
        usdcContractAddress: USDC_ADDRESS,
        fundAmountUsdc: depositOnly
          ? parseFloat(depositAmount) || 100
          : undefined,
      });
      setExistingSession(info);
    } catch (err: any) {
      setActionError(err.message || "Authorization failed");
    }
  };

  const isLoading =
    status !== "idle" && status !== "ready" && status !== "error";

  const statusLabels: Record<string, string> = {
    idle: "Ready",
    deriving: "Deriving smart wallet address…",
    generating_key: "Generating session key…",
    registering: "Registering on-chain (MetaMask)…",
    funding: "Depositing USDC (MetaMask)…",
    saving: "Saving session key to backend…",
    ready: "Authorization complete!",
    error: "Error",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080a06",
        color: "#e2e8f0",
        fontFamily: "'Syne', sans-serif",
        padding: "40px 24px",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(66,100%,50%,0.06), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 100,
              border: "1px solid hsl(66,100%,50%,0.3)",
              background: "hsl(66,100%,50%,0.08)",
              color: "hsl(66,100%,50%)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <Wallet size={12} />
            Recharge Hub
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Smart Wallet &{" "}
            <span
              style={{
                color: "hsl(66,100%,50%)",
                textShadow: "0 0 30px hsl(66,100%,50%,0.3)",
              }}
            >
              Agent Authorization
            </span>
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 14,
              marginTop: 10,
              lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            Deposit USDC into your Smart Wallet, then authorize the shopping
            agent with a spending limit. No more signing per-cart — the agent
            settles autonomously within your rules.
          </p>
        </div>

        {/* Active Session Banner */}
        {existingSession && (
          <div
            style={{
              background: "hsl(66,100%,50%,0.07)",
              border: "1px solid hsl(66,100%,50%,0.25)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CheckCircle2 size={18} color="hsl(66,100%,50%)" />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "hsl(66,100%,50%)",
                }}
              >
                Active Session Key
              </div>
              <div style={{ fontSize: 11, color: "#4a5568", marginTop: 2 }}>
                Spend limit: ${existingSession.spendLimitUsdc} USDC · Expires:{" "}
                {existingSession.expiresAt.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() =>
                checkExistingSession().then((s) => setExistingSession(s))
              }
              style={{
                background: "transparent",
                border: "none",
                color: "#4a5568",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Three-step flow diagram */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 24px 1fr 24px 1fr",
            gap: 0,
            marginBottom: 32,
            alignItems: "center",
          }}
        >
          {[
            { icon: DollarSign, label: "Deposit USDC", sublabel: "EOA → Smart Wallet", done: !!existingSession },
            null,
            { icon: Key, label: "Register Key", sublabel: "On-chain delegation", done: !!existingSession },
            null,
            { icon: Cpu, label: "Agent Active", sublabel: "Autonomous checkout", done: !!existingSession },
          ].map((step, i) => {
            if (step === null) {
              return (
                <div
                  key={i}
                  style={{
                    height: 1,
                    background: existingSession
                      ? "hsl(66,100%,50%,0.4)"
                      : "#1a2332",
                    margin: "0 4px",
                  }}
                />
              );
            }
            const Icon = step.icon;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: step.done
                      ? "hsl(66,100%,50%,0.15)"
                      : "#1a2332",
                    border: `1px solid ${
                      step.done
                        ? "hsl(66,100%,50%,0.5)"
                        : "#2d3748"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: step.done
                      ? "0 0 16px hsl(66,100%,50%,0.2)"
                      : "none",
                  }}
                >
                  <Icon
                    size={18}
                    color={
                      step.done ? "hsl(66,100%,50%)" : "#2d3748"
                    }
                  />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: step.done ? "#e2e8f0" : "#4a5568",
                    }}
                  >
                    {step.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#2d3748", marginTop: 2 }}>
                    {step.sublabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration Card */}
        <Card glow style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#4a5568",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Shield size={12} />
            Authorization Settings
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {/* Spend Limit */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#4a5568",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Spend Limit (USDC)
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#4a5568",
                    fontSize: 14,
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(e.target.value)}
                  min="1"
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 28px",
                    background: "#080c10",
                    border: "1px solid #1a2332",
                    borderRadius: 10,
                    color: "#e2e8f0",
                    fontSize: 14,
                    fontFamily: "'Syne', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Session Duration */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "#4a5568",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Session Duration
              </label>
              <select
                value={sessionHours}
                onChange={(e) => setSessionHours(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#080c10",
                  border: "1px solid #1a2332",
                  borderRadius: 10,
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontFamily: "'Syne', sans-serif",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="1">1 Hour</option>
                <option value="8">8 Hours</option>
                <option value="24">24 Hours</option>
                <option value="72">3 Days</option>
                <option value="168">1 Week</option>
              </select>
            </div>
          </div>

          {/* Deposit section */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#4a5568",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Fund Smart Wallet (Optional)
              </span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={depositOnly}
                  onChange={(e) => setDepositOnly(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Include deposit
                </span>
              </label>
            </div>

            {depositOnly && (
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#4a5568",
                    fontSize: 14,
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1"
                  placeholder="Amount in USDC"
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 28px",
                    background: "#080c10",
                    border: "1px solid #1a2332",
                    borderRadius: 10,
                    color: "#e2e8f0",
                    fontSize: 14,
                    fontFamily: "'Syne', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>

          {/* Status bar */}
          {isLoading && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "hsl(66,100%,50%,0.06)",
                border: "1px solid hsl(66,100%,50%,0.2)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Loader2
                size={14}
                color="hsl(66,100%,50%)"
                style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "hsl(66,100%,50%)" }}>
                {statusLabels[status] || status}
              </span>
            </div>
          )}

          {actionError && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "#ef444410",
                border: "1px solid #ef444430",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: 12, color: "#ef4444" }}>
                {actionError}
              </span>
            </div>
          )}

          {status === "ready" && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "hsl(66,100%,50%,0.08)",
                border: "1px solid hsl(66,100%,50%,0.3)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle2 size={14} color="hsl(66,100%,50%)" />
              <span style={{ fontSize: 12, color: "hsl(66,100%,50%)" }}>
                Agent authorized! Return to chat and start shopping.
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAuthorize}
            disabled={isLoading}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "16px 24px",
              background: isLoading
                ? "#1a2332"
                : "hsl(66,100%,50%)",
              border: "none",
              borderRadius: 12,
              color: isLoading ? "#4a5568" : "#000",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: isLoading
                ? "none"
                : "0 0 32px hsl(66,100%,50%,0.3)",
              transition: "all 0.2s",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                {statusLabels[status]}
              </>
            ) : existingSession ? (
              <>
                <RefreshCw size={16} />
                Renew Authorization
              </>
            ) : (
              <>
                <Zap size={16} />
                {depositOnly ? "Deposit & Authorize Agent" : "Authorize Shopping Agent"}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </Card>

        {/* Wallet Info Card */}
        {walletInfo && (
          <Card>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#4a5568",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={12} color="hsl(66,100%,50%)" />
              Session Key Registered
            </div>
            <InfoRow
              label="Smart Wallet"
              value={walletInfo.smartWalletAddress}
              mono
            />
            <InfoRow
              label="Session Key (public)"
              value={walletInfo.sessionKeyPublic}
              mono
            />
            <InfoRow
              label="Spend Limit"
              value={`$${walletInfo.spendLimitUsdc} USDC`}
            />
            <InfoRow
              label="Expires"
              value={walletInfo.expiresAt.toLocaleString()}
            />
          </Card>
        )}

        {/* How it works */}
        <Card style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#4a5568",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            How It Works
          </div>
          {[
            {
              icon: Wallet,
              title: "Smart Wallet Contract",
              desc: "An ERC-4337 account contract derived from your EOA. You own it — no custody risk.",
            },
            {
              icon: Key,
              title: "Session Key",
              desc: "A temporary keypair. The public half is registered on-chain with your spending rules. The private half is encrypted and stored by the agent.",
            },
            {
              icon: Cpu,
              title: "Autonomous Settlement",
              desc: "When the agent finds a 402 challenge, it signs a UserOp with the session key. The Bundler executes it. No popups.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: "flex",
                gap: 14,
                padding: "14px 0",
                borderBottom: "1px solid #1a2332",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "hsl(66,100%,50%,0.08)",
                  border: "1px solid hsl(66,100%,50%,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={15} color="hsl(66,100%,50%)" />
              </div>
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#4a5568",
                    marginTop: 4,
                    lineHeight: 1.6,
                  }}
                >
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}