"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Wallet, ShieldCheck, Zap, Bot, Search, CreditCard,
  CheckCircle2, ArrowRight, Package, Store, Sparkles, ExternalLink, ChevronRight,
} from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const SESSION_STORAGE_KEY = "cart_blanche_session_id";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentKind = "product_list" | "cart_mandate" | "plan" | "receipt" | "text";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agentName?: string;
  status?: "streaming" | "complete" | "error";
}

interface AgentChunk {
  agent: string;
  text: string;
  kind: ContentKind;
}

// ─── Content detection ────────────────────────────────────────────────────────
function tryParseJson(content: string): any | null {
  const bare = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(bare); } catch {}
  const m = bare.match(/(\{[\s\S]+\})/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

function classifyContent(content: string): ContentKind {
  const p = tryParseJson(content);
  if (!p) return "text";
  if (p.type === "product_list" && Array.isArray(p.products)) return "product_list";
  if (p.type === "cart_mandate" || (p.merchants && p.amount)) return "cart_mandate";
  if (p.type === "PLAN" && p.plan) return "plan";
  // "settled", "partial", "failed" — all settlement outcomes render as ReceiptCard
  if ((p.status === "settled" || p.status === "partial" || p.status === "failed") && Array.isArray(p.receipts)) return "receipt";
  return "text";
}

// Higher number = higher display priority
const KIND_PRIORITY: Record<ContentKind, number> = {
  receipt: 4, cart_mandate: 3, product_list: 2, plan: 1, text: 0,
};

/**
 * Deduplicate timeline: remove consecutive user messages with identical text
 * (caused by old saveTurn creating duplicate UserRequest records in the DB).
 */
function dedupeTimeline(tl: any[]): any[] {
  return tl.filter((item, idx) => {
    if (item.role !== "user") return true;
    // Drop if the immediately preceding user message has the same text
    for (let j = idx - 1; j >= 0; j--) {
      if (tl[j].role === "user") {
        return tl[j].text !== item.text;
      }
    }
    return true;
  });
}

/**
 * From all collected agent chunks in a turn, pick the single best one to show.
 * Structured cards beat prose; higher-priority cards beat lower ones.
 * For plain text, skip raw JSON blobs — only show real prose.
 */
function pickBestChunk(chunks: AgentChunk[]): AgentChunk | null {
  if (!chunks.length) return null;

  let best: AgentChunk | null = null;
  let bestP = -1;
  for (const c of chunks) {
    const p = KIND_PRIORITY[c.kind];
    if (p > bestP) { bestP = p; best = c; }
  }

  if (best?.kind === "text") {
    const prose = chunks.filter(c =>
      c.kind === "text" &&
      !c.text.trim().startsWith("{") &&
      !c.text.trim().startsWith("```") &&
      c.text.trim().length > 2
    );
    return prose.length ? prose[prose.length - 1] : null;
  }

  return best;
}

// ─── Agent config ─────────────────────────────────────────────────────────────
const AGENTS: Record<string, {
  color: string; bg: string; border: string; glow: string;
  icon: React.ReactNode; label: string;
}> = {
  Orchestrator:     { color: "#a78bfa", bg: "#1e1b4b", border: "#312e81", glow: "#a78bfa30", icon: <Search size={11}/>,     label: "Orchestrator" },
  ShoppingAgent:    { color: "#00ff9d", bg: "#012a1a", border: "#014d31", glow: "#00ff9d30", icon: <Bot size={11}/>,         label: "Shopping"     },
  MerchantAgent:    { color: "#fbbf24", bg: "#1c1406", border: "#78350f", glow: "#fbbf2430", icon: <CreditCard size={11}/>,  label: "Merchant"     },
  PaymentProcessor: { color: "#22d3ee", bg: "#012f2e", border: "#0e4f4b", glow: "#22d3ee30", icon: <ShieldCheck size={11}/>, label: "Settlement"   },
  Agent:            { color: "#64748b", bg: "#0f172a", border: "#1e293b", glow: "#64748b20", icon: <Bot size={11}/>,         label: "Agent"        },
};
const getAgent = (n?: string) => AGENTS[n ?? "Agent"] ?? AGENTS.Agent;

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ data }: { data: any }) {
  const items = (data.plan || "").split(";").map((s: string) => s.trim()).filter(Boolean);
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #a78bfa30", background: "linear-gradient(135deg,#0d0b1f,#12101e)", boxShadow: "0 0 40px #a78bfa10" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #a78bfa20", background: "linear-gradient(90deg,#a78bfa12,transparent)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#a78bfa15", border: "1px solid #a78bfa40", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={13} color="#a78bfa" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.12em", textTransform: "uppercase" }}>Shopping Plan</div>
          <div style={{ fontSize: 10, color: "#4a5568", marginTop: 1 }}>{items.length} item{items.length !== 1 ? "s" : ""} · searching catalog…</div>
        </div>
        {data.budget > 0 && (
          <div style={{ padding: "4px 12px", background: "#00ff9d10", border: "1px solid #00ff9d30", borderRadius: 20 }}>
            <span style={{ fontSize: 11, color: "#00ff9d", fontWeight: 700 }}>${data.budget} budget</span>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item: string, i: number) => {
          const ci = item.indexOf(":");
          const cat  = ci > -1 ? item.slice(0, ci).trim() : "";
          const name = ci > -1 ? item.slice(ci + 1).trim() : item;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#ffffff04", border: "1px solid #ffffff06", borderRadius: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#a78bfa15", border: "1px solid #a78bfa30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontWeight: 700, color: "#a78bfa" }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.3 }}>{name}</div>
                {cat && <div style={{ fontSize: 10, color: "#a78bfa80", marginTop: 2 }}>{cat}</div>}
              </div>
              <ChevronRight size={12} color="#a78bfa40" />
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px solid #a78bfa10" }}>
        <p style={{ fontSize: 11, color: "#4a5568", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "cbPulse 1.5s infinite" }} />
          Searching catalog now…
        </p>
      </div>
    </div>
  );
}

// ─── Mandate Card ─────────────────────────────────────────────────────────────
function MandateCard({ data }: { data: any }) {
  const merchants = data.merchants || [];
  const total = Number(data.amount || 0);
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #fbbf2430", background: "linear-gradient(135deg,#0d0b00,#1a1200)", boxShadow: "0 0 40px #fbbf2410" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #fbbf2420", background: "linear-gradient(90deg,#fbbf2412,transparent)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fbbf2415", border: "1px solid #fbbf2440", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CreditCard size={13} color="#fbbf24" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase" }}>Cart Mandate</div>
          <div style={{ fontSize: 10, color: "#78350f", marginTop: 1 }}>{merchants.length} vendor{merchants.length !== 1 ? "s" : ""} · USDC settlement</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", fontFamily: "'Syne',sans-serif" }}>${total.toFixed(2)}</div>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {merchants.map((m: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fbbf2408", border: "1px solid #fbbf2415", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#fbbf2415", border: "1px solid #fbbf2430", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>
                {(m.name || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
                {m.products?.length > 0 && <div style={{ fontSize: 10, color: "#78350f" }}>{m.products.length} item{m.products.length !== 1 ? "s" : ""}</div>}
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>${(m.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ margin: "0 16px 14px", padding: "12px 16px", background: "#fbbf2410", border: "1px solid #fbbf2430", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total USDC</div>
          <div style={{ fontSize: 11, color: "#78350f", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fbbf24", display: "inline-block", animation: "cbPulse 1.5s infinite" }} />
            Processing via STACKS network…
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24", fontFamily: "'Syne',sans-serif" }}>${total.toFixed(2)}</div>
      </div>
    </div>
  );
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────
function ReceiptCard({ data }: { data: any }) {
  const receipts = data.receipts || [];
  const failures = data.failures || [];
  const isFailed  = data.status === "failed" || (receipts.length === 0 && failures.length > 0);
  const isPartial = data.status === "partial" && receipts.length > 0;
  const isOk      = !isFailed && !isPartial;
  const total = receipts.reduce((s: number, r: any) => s + (r.amount_usd || 0), 0);
  const [checked, setChecked] = useState(false);
  useEffect(() => { const t = setTimeout(() => setChecked(true), 300); return () => clearTimeout(t); }, []);

  const headerColor   = isFailed ? "#ef4444" : isPartial ? "#f59e0b" : "#22d3ee";
  const headerBg      = isFailed ? "#1a0000" : isPartial ? "#1c1406" : "#001418";
  const headerBorder  = isFailed ? "#ef444430" : isPartial ? "#f59e0b30" : "#22d3ee30";
  const headerGlow    = isFailed ? "#ef444415" : isPartial ? "#f59e0b15" : "#22d3ee15";
  const headerLabel   = isFailed
    ? "Payment Failed"
    : receipts.length === 0
      ? "All Payments Failed"
      : isPartial
        ? `${receipts.length} of ${receipts.length + failures.length} Payments Confirmed`
        : "Payment Confirmed";

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${headerBorder}`, background: `linear-gradient(135deg,#00090d,${headerBg})`, boxShadow: `0 0 60px ${headerGlow}` }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${headerBorder}`, background: `linear-gradient(90deg,${headerColor}10,transparent)`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: checked ? `${headerColor}15` : "#0f172a", border: `2px solid ${checked ? headerColor : "#1e293b"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.4s", boxShadow: checked ? `0 0 20px ${headerColor}40` : "none", flexShrink: 0 }}>
          <CheckCircle2 size={20} color={checked ? headerColor : "#334155"} style={{ transition: "color 0.3s" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: headerColor }}>{headerLabel}</div>
          <div style={{ fontSize: 11, color: isFailed ? "#ef4444" : "#0e7490", marginTop: 2 }}>
            {isFailed ? "Check your Smart Wallet setup at /wallet" : receipts.length > 0 ? `${receipts.length} transaction${receipts.length !== 1 ? "s" : ""} settled on STACKS` : "No transactions confirmed"}
          </div>
        </div>
        {total > 0 && (
          <div style={{ padding: "6px 14px", background: `${headerColor}10`, border: `1px solid ${headerColor}30`, borderRadius: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: headerColor, fontFamily: "'Syne',sans-serif" }}>${total.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Confirmed receipts */}
      {receipts.length > 0 && (
        <div style={{ padding: "12px 16px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
          {receipts.map((r: any, i: number) => (
            <div key={i} style={{ padding: "12px 14px", background: "#22d3ee06", border: "1px solid #22d3ee15", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <CheckCircle2 size={11} color="#22d3ee" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{r.commodity}</span>
                </div>
                <div style={{ fontSize: 10, color: "#0e7490", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                  {r.tx_hash}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee" }}>${(r.amount_usd || 0).toFixed(2)}</span>
                <a href={`https://explorer.hiro.so/txid/0x${r.tx_hash}?chain`} target="_blank" rel="noopener noreferrer"
                  style={{ width: 24, height: 24, borderRadius: 6, background: "#22d3ee10", border: "1px solid #22d3ee25", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  <ExternalLink size={11} color="#22d3ee" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed transactions — show exact error */}
      {failures.length > 0 && (
        <div style={{ padding: receipts.length > 0 ? "6px 16px 12px" : "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {receipts.length > 0 && (
            <div style={{ fontSize: 10, color: "#ef444480", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 0" }}>
              Failed
            </div>
          )}
          {failures.map((f: any, i: number) => (
            <div key={i} style={{ padding: "12px 14px", background: "#ef444408", border: "1px solid #ef444425", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef444430", border: "1px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 7, color: "#ef4444", lineHeight: 1 }}>✕</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fca5a5" }}>{f.commodity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#ef4444b0", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {f.error}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", flexShrink: 0 }}>${(f.amount_usd || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: headerColor, boxShadow: `0 0 8px ${headerColor}` }} />
          <span style={{ fontSize: 11, color: "#0e7490" }}>{data.network || "Stacks Testnet"} · Burner Wallet · SIP-010</span>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: any; index: number }) {
  const [imgError, setImgError] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), index * 55); return () => clearTimeout(t); }, [index]);
  console.log(product);
  const hasImg = product.images?.[0] && !imgError && !product.images[0].includes("placeholder");

  return (
    <Link href={`/products/${product.id}`} target="_blank" rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none", borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b", background: "#0a0f18", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#00ff9d40"; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px #00ff9d10"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#1e293b"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}>
      <div style={{ height: 80, background: "#070c14", position: "relative", overflow: "hidden" }}>
        {hasImg
          ? <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} onError={() => setImgError(true)} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#0a1628,#0d1f2d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.07)" }}>{product.name.charAt(0)}</div>
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,#0a0f18,transparent 60%)" }} />
        <div style={{ position: "absolute", top: 7, left: 8, padding: "2px 7px", background: "#00ff9d15", border: "1px solid #00ff9d30", borderRadius: 4, fontSize: 9, fontWeight: 700, color: "#00ff9d", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {product.category}
        </div>
        <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.8)", fontFamily: "'Syne',sans-serif" }}>
          ${product.price.toFixed(2)}
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Store size={9} color="#4a5568" />
            <span style={{ fontSize: 10, color: "#4a5568", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.vendor}</span>
          </div>
          {product.stock > 0 && <span style={{ fontSize: 9, color: "#00ff9d", display: "flex", alignItems: "center", gap: 3 }}><Package size={9} />{product.stock}</span>}
        </div>
      </div>
    </Link>
  );
}

// ─── Product List Card ────────────────────────────────────────────────────────
function ProductListCard({ data, onConfirm }: { data: any; onConfirm: () => void }) {
  const { products, total, budget } = data;
  const [confirmed, setConfirmed] = useState(false);
  const savings = budget > 0 ? budget - total : 0;
  const pct     = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #00ff9d20", background: "linear-gradient(135deg,#000e07,#001208)", boxShadow: "0 0 40px #00ff9d08" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #00ff9d15", background: "linear-gradient(90deg,#00ff9d10,transparent)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#00ff9d15", border: "1px solid #00ff9d40", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={13} color="#00ff9d" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#00ff9d", letterSpacing: "0.12em", textTransform: "uppercase" }}>Your Cart</div>
            <div style={{ fontSize: 10, color: "#014d31", marginTop: 1 }}>{products.length} item{products.length !== 1 ? "s" : ""} · ready to buy</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#00ff9d", fontFamily: "'Syne',sans-serif" }}>${total.toFixed(2)}</div>
          {budget > 0 && <div style={{ fontSize: 10, color: "#4a5568", marginTop: 1 }}>of ${budget.toFixed(0)} budget</div>}
        </div>
      </div>

      {/* Budget bar */}
      {budget > 0 && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #00ff9d10" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#4a5568" }}>Budget usage</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: savings >= 0 ? "#00ff9d" : "#ef4444" }}>
              {savings >= 0 ? `$${savings.toFixed(2)} remaining` : `$${Math.abs(savings).toFixed(2)} over budget`}
            </span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "#1e293b", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: pct > 95 ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#00ff9d,#00b4d8)", transition: "width 1s ease" }} />
          </div>
        </div>
      )}

      {/* Products */}
      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 10 }}>
        {products.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #00ff9d10", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: 11, color: "#4a5568", margin: 0, lineHeight: 1.5 }}>Happy with these picks? Click to proceed to checkout.</p>
        <button
          onClick={() => { setConfirmed(true); onConfirm(); }}
          disabled={confirmed}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: confirmed ? "#1e293b" : "#00ff9d", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, color: confirmed ? "#4a5568" : "#000", cursor: confirmed ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: confirmed ? "none" : "0 0 20px #00ff9d40", transition: "all 0.2s" }}>
          {confirmed ? <><CheckCircle2 size={13} /> Confirmed!</> : <><Sparkles size={13} /> Looks Good <ArrowRight size={12} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown components={{
      p:      ({ children }) => <p style={{ margin: "0 0 10px", lineHeight: 1.75, color: "#94a3b8", fontSize: 13.5, letterSpacing: "0.01em" }}>{children}</p>,
      strong: ({ children }) => <strong style={{ color: "#e2e8f0", fontWeight: 600 }}>{children}</strong>,
      em:     ({ children }) => <em style={{ color: "#64748b" }}>{children}</em>,
      ul:     ({ children }) => <ul style={{ margin: "6px 0 10px", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>{children}</ul>,
      li:     ({ children }) => (
        <li style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#94a3b8", lineHeight: 1.65 }}>
          <span style={{ color: "#00ff9d", marginTop: 7, fontSize: 6, flexShrink: 0 }}>◆</span>
          <span>{children}</span>
        </li>
      ),
      a:    ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#00b4d8", textDecoration: "none", borderBottom: "1px solid #00b4d830" }}>{children}</a>,
      code: ({ children }) => <code style={{ fontFamily: "monospace", fontSize: 11, background: "#0f172a", color: "#67e8f9", padding: "2px 6px", borderRadius: 4, border: "1px solid #1e293b" }}>{children}</code>,
      h1:   ({ children }) => <h1 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px", fontFamily: "'Syne',sans-serif" }}>{children}</h1>,
      h2:   ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: "0 0 6px" }}>{children}</h2>,
      h3:   ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", margin: "0 0 4px" }}>{children}</h3>,
      hr:   () => <hr style={{ border: "none", borderTop: "1px solid #1e293b", margin: "10px 0" }} />,
    }}>
      {content}
    </ReactMarkdown>
  );
}

// ─── Agent Bubble ─────────────────────────────────────────────────────────────
function AgentBubble({ msg, onConfirm }: { msg: Message; onConfirm: () => void }) {
  const agent = getAgent(msg.agentName);
  const isStreaming = msg.status === "streaming";

  // Loading state — show dots
  if (isStreaming && (!msg.content || msg.content === "_loading_")) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: "#0f172a", border: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={12} color="#475569" />
        </div>
        <div style={{ background: "#080e1a", border: "1px solid #1e293b", borderRadius: "2px 12px 12px 12px", padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#334155", animation: `cbBounce 1.1s ease-in-out ${i * 0.18}s infinite`, display: "inline-block" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kind   = classifyContent(msg.content);
  const parsed = kind !== "text" ? tryParseJson(msg.content) : null;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "90%" }}>
      {/* Avatar */}
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginTop: 2, background: agent.bg, border: `1px solid ${agent.border}`, boxShadow: `0 0 12px ${agent.glow}`, display: "flex", alignItems: "center", justifyContent: "center", color: agent.color }}>
        {agent.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: agent.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{agent.label}</span>
          <span style={{ fontSize: 10, color: "#1e293b", fontFamily: "monospace" }}>
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isStreaming && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: agent.color, animation: "cbPulse 1.2s ease-in-out infinite", display: "inline-block" }} />
          )}
        </div>

        {/* ONE card or ONE prose bubble — never raw JSON */}
        {kind === "product_list" && parsed && <ProductListCard data={parsed} onConfirm={onConfirm} />}
        {kind === "plan"         && parsed && <PlanCard data={parsed} />}
        {kind === "cart_mandate" && parsed && <MandateCard data={parsed} />}
        {kind === "receipt"      && parsed && <ReceiptCard data={parsed} />}
        {kind === "text" && msg.content && msg.content !== "_loading_" && (
          <div style={{ background: "#080e1a", border: "1px solid #1e293b", borderRadius: "2px 12px 12px 12px", padding: "13px 16px" }}>
            <AgentMarkdown content={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Bubble ──────────────────────────────────────────────────────────────
function UserBubble({ content, timestamp }: { content: string; timestamp: Date }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: 520 }}>
        <div style={{ background: "linear-gradient(135deg,#0f1f35,#0d1a2e)", border: "1px solid #1e3a5f", borderRadius: "14px 2px 14px 14px", padding: "12px 16px", fontSize: 14, color: "#e2e8f0", lineHeight: 1.65, wordBreak: "break-word", boxShadow: "0 2px 12px rgba(0,0,0,.3)" }}>
          {content}
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#1e293b", marginTop: 4, paddingRight: 2 }}>
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─── Wallet Banner ────────────────────────────────────────────────────────────
function WalletBanner() {
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/wallet/session-key").then(r => r.json()).then(d => setActive(!!d.data)).catch(() => setActive(false));
  }, []);
  if (active === null) return null;
  if (active) return (
    <Link href="/wallet" style={{ textDecoration: "none" }}>
      <button
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 12px",
          background: "#00ff9d0a",
          border: "1px solid #00ff9d25",
          borderRadius: 20,
          fontSize: 11,
          color: "#00ff9d",
          cursor: "pointer",
          transition: "all .15s"
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 6px #00ff9d" }} />
        Go to Smart Wallet
      </button>
    </Link>
  );
  return (
    <Link href="/wallet" style={{ textDecoration: "none" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "#0c111d", border: "1px solid #1e293b", borderRadius: 20, fontSize: 11, color: "#475569", cursor: "pointer", transition: "all .15s" }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#334155"; el.style.color = "#94a3b8"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#1e293b"; el.style.color = "#475569"; }}>
        <Wallet size={11} />
        Set up Smart Wallet for instant checkout →
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const suggestions = [
    "Gaming YouTube channel setup under $100",
    "Full-stack dev tools: IDE + deployment under $200",
    "AI/ML engineering tools under $300",
    "Cybersecurity starter kit for a developer",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 32, padding: "80px 24px", textAlign: "center" }}>
      <div>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#00ff9d10,#00b4d810)", border: "1px solid #00ff9d20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 30px #00ff9d08" }}>
          <Zap size={28} color="#00ff9d" strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "0 0 10px", fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em" }}>Cart‑Blanche Nova</h2>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.75, maxWidth: 360, margin: "0 auto" }}>
          Tell me what you need. I'll search the live catalog, build your cart, and settle via your Smart Wallet — automatically.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 520 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => onPick(s)} style={{ padding: "8px 16px", background: "#08111e", border: "1px solid #1e293b", borderRadius: 20, color: "#475569", fontSize: 12, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.4, transition: "all .15s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#334155"; el.style.color = "#94a3b8"; el.style.background = "#0d1828"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "#1e293b"; el.style.color = "#475569"; el.style.background = "#08111e"; }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Session helpers ──────────────────────────────────────────────────────────
const mkId = () => `sess-${Math.random().toString(36).slice(2, 9)}`;
function getOrCreate() {
  if (typeof window === "undefined") return mkId();
  const s = localStorage.getItem(SESSION_STORAGE_KEY);
  if (s) return s;
  const id = mkId();
  localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [sessionId, setSessionId] = useState(getOrCreate);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [booting,   setBooting]   = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const named     = useRef(false);
  const { toast } = useToast();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Restore session from DB — show only best-card-per-turn
  useEffect(() => {
    const id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) { setBooting(false); return; }
    fetch(`/api/chats/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rawTl: any[] = d?.data?.timeline ?? [];
        if (!rawTl.length) return;
        const tl = dedupeTimeline(rawTl);
        const restored: Message[] = [];
        let i = 0;
        while (i < tl.length) {
          const item = tl[i];
          if (item.role === "user") {
            restored.push({ id: item.id, role: "user", content: item.text, timestamp: new Date(item.timestamp), status: "complete" });
            i++;
          } else {
            // Collect all consecutive agent messages for this turn
            const agentItems: any[] = [];
            while (i < tl.length && tl[i].role !== "user") { agentItems.push(tl[i]); i++; }
            const chunks: AgentChunk[] = agentItems.map(m => ({ agent: m.type || "Agent", text: m.text, kind: classifyContent(m.text) }));
            const best = pickBestChunk(chunks);
            if (best) restored.push({ id: agentItems[0].id, role: "assistant", content: best.text, agentName: best.agent, timestamp: new Date(agentItems[0].timestamp), status: "complete" });
          }
        }
        setMessages(restored);
        named.current = true;
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  const ensureChat = useCallback(async (id: string, name?: string) => {
    try {
      await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...(name && { name }) }) });
    } catch {}
  }, []);

  const newChat = useCallback(() => {
    const id = mkId();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    setSessionId(id); setMessages([]); setInput(""); setLoading(false);
    named.current = false;
  }, []);

  const selectChat = useCallback(async (id: string) => {
    if (id === sessionId) return;
    setLoading(true); setMessages([]);
    try {
      const r = await fetch(`/api/chats/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const rawTl: any[] = d.data?.timeline ?? [];
      const tl = dedupeTimeline(rawTl);
      const restored: Message[] = [];
      let i = 0;
      while (i < tl.length) {
        const item = tl[i];
        if (item.role === "user") { restored.push({ id: item.id, role: "user", content: item.text, timestamp: new Date(item.timestamp), status: "complete" }); i++; }
        else {
          const agentItems: any[] = [];
          while (i < tl.length && tl[i].role !== "user") { agentItems.push(tl[i]); i++; }
          const chunks: AgentChunk[] = agentItems.map(m => ({ agent: m.type || "Agent", text: m.text, kind: classifyContent(m.text) }));
          const best = pickBestChunk(chunks);
          if (best) restored.push({ id: agentItems[0].id, role: "assistant", content: best.text, agentName: best.agent, timestamp: new Date(agentItems[0].timestamp), status: "complete" });
        }
      }
      setMessages(restored);
      setSessionId(id);
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      named.current = true;
    } catch { toast({ title: "Failed to load chat", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [sessionId, toast]);

  // ── Core: one bubble per turn, upgrades to best card as chunks arrive ───────
  const streamSSE = useCallback(async (
    res: Response,
    msgId: string
  ): Promise<{ content: string; agentName: string }> => {
    const reader    = res.body!.getReader();
    const dec       = new TextDecoder();
    const collected: AgentChunk[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      for (const line of dec.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const data  = JSON.parse(raw);
          const text  = (data.content?.parts?.[0]?.text || "") as string;
          const agent = (data.agent || "Agent") as string;

          if (!text.trim()) continue;

          const kind = classifyContent(text);

          // Hard-filter: never collect raw-JSON-looking plain text blobs
          if (kind === "text" && text.trim().startsWith("{")) continue;

          collected.push({ agent, text, kind });

          // Live-update bubble with best content so far
          const best = pickBestChunk(collected);
          if (best) {
            setMessages(p => p.map(m => m.id === msgId
              ? { ...m, content: best.text, agentName: best.agent, status: "streaming" }
              : m
            ));
          }
        } catch {}
      }
    }

    // Finalise bubble
    const best = pickBestChunk(collected);
      setMessages(p => p.map(m => m.id === msgId
        ? { ...m, content: best?.text || "", agentName: best?.agent || "Agent", status: "complete" }
        : m
      ));
      return { content: best?.text || "", agentName: best?.agent || "Agent" };
    }, []);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;

    setMessages(p => [...p, { id: `user-${Date.now()}`, role: "user", content: t, timestamp: new Date(), status: "complete" }]);
    setInput("");
    setLoading(true);

    const chatName = !named.current ? t.slice(0, 60) + (t.length > 60 ? "…" : "") : undefined;
    await ensureChat(sessionId, chatName);
    if (!named.current && chatName) named.current = true;

    // Single response bubble — starts as loading dots
    const msgId = `agent-${Date.now()}`;
    setMessages(p => [...p, { id: msgId, role: "assistant", content: "_loading_", agentName: "Agent", timestamp: new Date(), status: "streaming" }]);

    try {
      const r = await fetch("http://localhost:8000/run_sse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: t }),
      });
      if (!r.body) throw new Error("No response body");
      await streamSSE(r, msgId);
    } catch {
      setMessages(p => p.map(m => m.id === msgId
        ? { ...m, content: "Could not reach the agent. Is the backend running?", role: "system" as const, status: "error" }
        : m
      ));
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, ensureChat, streamSSE]);

  const looksGood = useCallback(() => send("Looks good"), [send]);

  if (booting) return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", alignItems: "center", justifyContent: "center", background: "#060a12" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#334155" }}>
        <div style={{ width: 22, height: 22, border: "2px solid #1e293b", borderTopColor: "#00ff9d", borderRadius: "50%", animation: "cbSpin .7s linear infinite" }} />
        <span style={{ fontSize: 12 }}>Restoring session…</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "#060a12", overflow: "hidden" }}>
      <ChatSidebar currentSessionId={sessionId} onNewChat={newChat} onSelectChat={selectChat} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Banner */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #0c1220", flexShrink: 0 }}>
          <WalletBanner />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 16px", scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}>
          <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
            {messages.length === 0
              ? <EmptyState onPick={send} />
              : messages.map(msg => {
                  if (msg.role === "user")   return <UserBubble  key={msg.id} content={msg.content} timestamp={msg.timestamp} />;
                  if (msg.role === "system") return (
                    <div key={msg.id} style={{ textAlign: "center" }} >
                      <span style={{ fontSize: 11, color: "#ef4444", background: "#450a0a20", border: "1px solid #450a0a40", padding: "5px 14px", borderRadius: 20, display: "inline-block" }}>
                        {msg.content}
                      </span>
                    </div>
                  );
                  return <AgentBubble key={msg.id} msg={msg} onConfirm={looksGood} />;
                })
            }
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: "12px 24px 20px", flexShrink: 0, borderTop: "1px solid #0c1220" }}>
          <div style={{ maxWidth: 740, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#0a1020", border: "1px solid #1e293b", borderRadius: 14, padding: "10px 10px 10px 16px", transition: "border-color .15s, box-shadow .15s" }}
              onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "#334155"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px #00ff9d08"; }}
              onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="What are we shopping for today?"
                rows={1} disabled={loading}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "#cbd5e1", fontFamily: "inherit", lineHeight: 1.6, maxHeight: 120, overflowY: "auto", scrollbarWidth: "none" }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()}
                style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: (input.trim() && !loading) ? "linear-gradient(135deg,#00ff9d20,#00b4d820)" : "#0f172a", border: `1px solid ${(input.trim() && !loading) ? "#00ff9d50" : "#1e293b"}`, cursor: (input.trim() && !loading) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", boxShadow: (input.trim() && !loading) ? "0 0 12px #00ff9d20" : "none" }}>
                <Send size={13} color={(input.trim() && !loading) ? "#00ff9d" : "#1e293b"} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 10, color: "#1e293b", padding: "0 2px" }}>
              <span>Enter ↵ to send · Shift+Enter for new line</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ShieldCheck size={10} />Smart Wallet · x402 · STACKS</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
        @keyframes cbPulse  { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes cbBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes cbSpin   { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar       { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:3px; }
        textarea::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}