"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Wallet, Search, ShieldCheck, Zap, Bot, CreditCard } from "lucide-react";
import { ProductListCard, type ProductListData } from "./ProductListCard";
import { ChatSidebar } from "@/components/chat-sidebar";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import MarkdownProductCards from "./MarkdownProductCards";

const SESSION_STORAGE_KEY = "cart_blanche_session_id";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agentName?: string;
  status?: "streaming" | "complete" | "error";
  receipt?: any;
}

// ─── Agent config ─────────────────────────────────────────────────────────────
const AGENTS: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  Orchestrator:     { color: "#a78bfa", bg: "#1e1b4b", border: "#312e81", icon: <Search size={12}/>,      label: "Orchestrator"  },
  ShoppingAgent:    { color: "#34d399", bg: "#022c22", border: "#064e3b", icon: <Bot size={12}/>,          label: "Shopping"      },
  MerchantAgent:    { color: "#fbbf24", bg: "#1c1406", border: "#78350f", icon: <CreditCard size={12}/>,  label: "Merchant"      },
  PaymentProcessor: { color: "#22d3ee", bg: "#042f2e", border: "#0e4f4b", icon: <ShieldCheck size={12}/>, label: "Settlement"    },
  Agent:            { color: "#64748b", bg: "#0f172a", border: "#1e293b", icon: <Bot size={12}/>,          label: "Agent"         },
};
const getAgent = (n?: string) => AGENTS[n ?? "Agent"] ?? AGENTS.Agent;

// ─── Parse helpers ────────────────────────────────────────────────────────────
function tryParseJson(content: string): any | null {
  const bare = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(bare); } catch {}
  const m = bare.match(/(\{[\s\S]+\})/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

type ContentKind = "product_list" | "cart_mandate" | "plan" | "receipt" | "text";

function classifyContent(content: string): ContentKind {
  const p = tryParseJson(content);
  if (!p) return "text";
  if (p.type === "product_list" && Array.isArray(p.products)) return "product_list";
  if (p.type === "cart_mandate" || (p.merchants && p.amount)) return "cart_mandate";
  if (p.type === "PLAN" && p.plan) return "plan";
  if (p.status === "settled" && p.receipts) return "receipt";
  return "text";
}

function stripJson(content: string): string {
  return content
    .replace(/```(?:json)?[\s\S]*?```/g, "")
    .replace(/\{[\s\S]*?"type"\s*:\s*"product_list"[\s\S]*?\}/g, "")
    .replace(/\{[\s\S]*?"type"\s*:\s*"cart_mandate"[\s\S]*?\}/g, "")
    .replace(/\{[\s\S]*?"status"\s*:\s*"settled"[\s\S]*?\}/g, "")
    .trim();
}

// ─── Structured cards ─────────────────────────────────────────────────────────

function PlanCard({ data }: { data: any }) {
  const items = (data.plan || "").split(";").map((s: string) => s.trim()).filter(Boolean);
  return (
    <div style={{ borderLeft: "2px solid #7c3aed", paddingLeft: 14, marginBottom: 2 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a78bfa", fontWeight: 700, marginBottom: 10 }}>
        Shopping Plan
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item: string, i: number) => {
          const colonIdx = item.indexOf(":");
          const cat = colonIdx > -1 ? item.slice(0, colonIdx).trim() : "";
          const name = colonIdx > -1 ? item.slice(colonIdx + 1).trim() : item;
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4c1d95", minWidth: 20 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 13, color: "#c4b5fd", flex: 1 }}>{name}</span>
              {cat && <span style={{ fontSize: 10, color: "#4c1d95", flexShrink: 0 }}>{cat}</span>}
            </div>
          );
        })}
      </div>
      {data.budget > 0 && (
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#052e16", border: "1px solid #166534", borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: "#4ade80" }}>Budget</span>
          <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>${data.budget}</span>
        </div>
      )}
    </div>
  );
}

function MandateCard({ data }: { data: any }) {
  const merchants = data.merchants || [];
  return (
    <div style={{ borderLeft: "2px solid #d97706", paddingLeft: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fbbf24", fontWeight: 700, marginBottom: 10 }}>
        Cart Mandate
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {merchants.map((m: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "#0f172a", borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{m.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>${(m.amount || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#1c1406", border: "1px solid #92400e", borderRadius: 6 }}>
        <span style={{ fontSize: 11, color: "#92400e" }}>Total</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#fbbf24" }}>${Number(data.amount || 0).toFixed(2)} USDC</span>
      </div>
    </div>
  );
}

function ReceiptCard({ data }: { data: any }) {
  const receipts = data.receipts || [];
  const total = receipts.reduce((s: number, r: any) => s + (r.amount_usd || 0), 0);
  return (
    <div style={{ borderLeft: "2px solid #0891b2", paddingLeft: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#164e63", border: "1px solid #0e7490", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#22d3ee" }}>✓</span>
        <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700 }}>Payment Confirmed</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {receipts.map((r: any, i: number) => (
          <div key={i} style={{ padding: "7px 10px", background: "#0f172a", borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{r.commodity}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#22d3ee" }}>${(r.amount_usd || 0).toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 10, color: "#164e63", fontFamily: "monospace", marginTop: 2 }}>
              {(r.tx_hash || "").slice(0, 30)}…
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#042f2e", border: "1px solid #0e4f4b", borderRadius: 6 }}>
        <span style={{ fontSize: 11, color: "#0e7490" }}>Total settled</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#22d3ee" }}>${total.toFixed(2)} USDC</span>
      </div>
      <div style={{ marginTop: 7, fontSize: 10, color: "#164e63" }}>SKALE network · Smart Wallet session key</div>
    </div>
  );
}

// ─── Message components ───────────────────────────────────────────────────────

function UserBubble({ content, timestamp }: { content: string; timestamp: Date }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: 540 }}>
        <div style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "14px 2px 14px 14px",
          padding: "11px 16px",
          fontSize: 14, color: "#e2e8f0", lineHeight: 1.65,
          wordBreak: "break-word",
        }}>
          {content}
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#1e293b", marginTop: 4, paddingRight: 2 }}>
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function AgentBubble({ msg, onConfirm }: { msg: Message; onConfirm: () => void }) {
  const agent = getAgent(msg.agentName);
  const isStreaming = msg.status === "streaming";
  const isComplete = msg.status === "complete";

  // Determine content type
  const kind: ContentKind = isComplete ? classifyContent(msg.content) : "text";
  const parsed = (kind !== "text") ? tryParseJson(msg.content) : null;
  const prose = (kind !== "text") ? stripJson(msg.content) : msg.content;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "86%" }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: agent.bg,
        border: `1px solid ${agent.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: agent.color,
      }}>
        {agent.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Agent label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: agent.color, letterSpacing: "0.04em" }}>
            {agent.label}
          </span>
          <span style={{ fontSize: 10, color: "#1e293b", fontFamily: "monospace" }}>
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          {isStreaming && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: agent.color, animation: "pulse 1.4s ease-in-out infinite", display: "inline-block", opacity: 0.8 }} />
          )}
        </div>

        {/* Bubble */}
        <div style={{
          background: "#0c1220",
          border: "1px solid #1e293b",
          borderRadius: "2px 12px 12px 12px",
          padding: kind === "product_list" ? "0" : "14px 16px",
          overflow: "hidden",
        }}>

          {/* === PRODUCT LIST — full width, colourful card === */}
          {kind === "product_list" && parsed && (
            <div style={{ padding: "4px" }}>
              <ProductListCard data={parsed as ProductListData} onConfirm={onConfirm} />
            </div>
          )}

          {/* === PLAN card === */}
          {kind === "plan" && parsed && (
            <PlanCard data={parsed} />
          )}

          {/* === CART MANDATE card === */}
          {kind === "cart_mandate" && parsed && (
            <MandateCard data={parsed} />
          )}

          {/* === RECEIPT card === */}
          {kind === "receipt" && parsed && (
            <ReceiptCard data={parsed} />
          )}

          {/* === Legacy receipt on msg.receipt === */}
          {msg.receipt && (
            <ReceiptCard data={msg.receipt} />
          )}

          {/* === Prose text (always rendered if non-empty) === */}
          {prose.trim() && (
            <div style={{ marginTop: (kind !== "text" && prose.trim()) ? 12 : 0 }}>
              <MarkdownProductCards>{prose}</MarkdownProductCards>
            </div>
          )}

          {/* === Streaming dots when no text yet === */}
          {!prose.trim() && isStreaming && (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#334155",
                  animation: `bounce 1.1s ease-in-out ${i * 0.17}s infinite`,
                  display: "inline-block",
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Wallet banner ────────────────────────────────────────────────────────────
function WalletBanner() {
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/wallet/session-key").then(r => r.json()).then(d => setActive(!!d.data)).catch(() => setActive(false));
  }, []);
  if (active === null) return null;
  if (active) return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", background: "#052e16", border: "1px solid #166534", borderRadius: 8, fontSize: 12, color: "#4ade80" }}>
      <Zap size={11} />
      Smart Wallet authorized — agent settles autonomously
    </div>
  );
  return (
    <Link href="/wallet" style={{ textDecoration: "none" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", background: "#0c111d", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer", transition: "all .15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#334155"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.color = "#475569"; }}
      >
        <Wallet size={11} />
        Set up Smart Wallet for instant checkout →
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const suggestions = [
    "Buy stuff for a gaming YouTube channel under $100",
    "Full-stack dev setup: IDE + deployment under $200",
    "AI/ML engineering tools under $300",
    "Budget camping gear for the weekend",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 32, padding: "80px 24px", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3, letterSpacing: "-2px" }}>◈◉◆</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          Cart‑Blanche Nova
        </h2>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.75, maxWidth: 360, margin: "0 auto" }}>
          Tell me what you need. I'll search the live catalog, build your cart, and settle via your Smart Wallet — automatically.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 520 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => onPick(s)} style={{
            padding: "8px 16px", background: "#0c1220", border: "1px solid #1e293b",
            borderRadius: 20, color: "#475569", fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", lineHeight: 1.4, transition: "all .15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#334155"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.color = "#475569"; }}
          >
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [sessionId, setSessionId] = useState(getOrCreate);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const named = useRef(false);
  const { toast } = useToast();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Restore session from DB
  useEffect(() => {
    const id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) { setBooting(false); return; }
    fetch(`/api/chats/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const tl: any[] = d?.data?.timeline ?? [];
        if (tl.length) {
          setMessages(tl.map(it => ({
            id: it.id, role: it.role === "user" ? "user" : "assistant",
            content: it.text, timestamp: new Date(it.timestamp),
            agentName: it.role === "agent" ? it.type : undefined, status: "complete",
          })));
          initialized.current = true;
          named.current = true;
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  const ensureChat = useCallback(async (id: string, name?: string) => {
    try {
      await fetch("/api/chats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...(name && { name }) }),
      });
      initialized.current = true;
    } catch {}
  }, []);

  const saveTurn = useCallback(async (chatId: string, userText: string, agentText: string, agentName: string) => {
    try {
      await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: { type: "USER", text: userText },
          agentMessage: { type: agentName || "AGENT", text: agentText },
        }),
      });
    } catch {}
  }, []);

  const newChat = useCallback(() => {
    const id = mkId();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    setSessionId(id); setMessages([]); setInput(""); setLoading(false);
    initialized.current = false; named.current = false;
  }, []);

  const selectChat = useCallback(async (id: string) => {
    if (id === sessionId) return;
    setLoading(true); setMessages([]);
    try {
      const r = await fetch(`/api/chats/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const tl: any[] = d.data?.timeline ?? [];
      setMessages(tl.map(it => ({
        id: it.id, role: it.role === "user" ? "user" : "assistant",
        content: it.text, timestamp: new Date(it.timestamp),
        agentName: it.role === "agent" ? it.type : undefined, status: "complete",
      })));
      setSessionId(id);
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      initialized.current = true; named.current = true;
    } catch { toast({ title: "Failed to load chat", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [sessionId, toast]);

  // Stream SSE response
  const streamSSE = useCallback(async (res: Response): Promise<{ content: string; agentName: string }> => {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let cur = "", agent = "Agent", final = "", finalAgent = "Agent";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const data = JSON.parse(raw);
          if (data.type === "state_update") continue;

          if (data.agent && data.agent !== agent) {
            setMessages(p => {
              const a = [...p];
              const l = a[a.length - 1];
              if (l?.role === "assistant" && l.status === "streaming") l.status = "complete";
              return a;
            });
            cur = ""; agent = data.agent;
          } else if (data.agent) agent = data.agent;

          if (data.content) {
            const chunk = data.content?.parts?.[0]?.text;
            if (!chunk) continue;
            cur += chunk;
            setMessages(p => {
              const a = [...p];
              const l = a[a.length - 1];
              if (l?.role === "assistant" && l.status === "streaming" && l.agentName === agent) {
                l.content = cur;
              } else {
                a.push({ id: Date.now().toString(), role: "assistant", agentName: agent, content: cur, timestamp: new Date(), status: "streaming" });
              }
              return a;
            });
          }

          if (data.type === "end") {
            if (cur) { final = cur; finalAgent = agent; }
            setMessages(p => {
              const a = [...p];
              const l = a[a.length - 1];
              if (l?.role === "assistant" && l.status === "streaming") l.status = "complete";
              return a;
            });
            cur = "";
          }
        } catch {}
      }
    }
    setMessages(p => {
      const a = [...p];
      const l = a[a.length - 1];
      if (l?.role === "assistant" && l.status === "streaming") l.status = "complete";
      return a;
    });
    return { content: final || cur, agentName: finalAgent || agent };
  }, []);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;

    setMessages(p => [...p, {
      id: Date.now().toString(), role: "user",
      content: t, timestamp: new Date(), status: "complete",
    }]);
    setInput("");
    setLoading(true);

    const chatName = !named.current ? t.slice(0, 60) + (t.length > 60 ? "…" : "") : undefined;
    await ensureChat(sessionId, chatName);
    if (!named.current && chatName) named.current = true;

    try {
      const r = await fetch("http://localhost:8000/run_sse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: t }),
      });
      if (!r.body) throw new Error("No response body");
      const { content, agentName } = await streamSSE(r);
      if (content) await saveTurn(sessionId, t, stripJson(content) || content, agentName);
    } catch {
      setMessages(p => [...p, {
        id: Date.now().toString(), role: "system",
        content: "Could not reach the agent. Is the backend running?",
        timestamp: new Date(), status: "error",
      }]);
    } finally { setLoading(false); }
  }, [loading, sessionId, ensureChat, streamSSE, saveTurn]);

  const looksGood = useCallback(() => send("Looks good"), [send]);

  if (booting) return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", alignItems: "center", justifyContent: "center", background: "#060a12" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#334155" }}>
        <div style={{ width: 22, height: 22, border: "2px solid #1e293b", borderTopColor: "#475569", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <span style={{ fontSize: 12 }}>Restoring session…</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "#060a12", overflow: "hidden" }}>
      <ChatSidebar currentSessionId={sessionId} onNewChat={newChat} onSelectChat={selectChat} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Top banner */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #0c1220", flexShrink: 0 }}>
          <WalletBanner />
        </div>

        {/* Messages scroll area */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "28px 24px 16px",
          scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              messages.map(msg => {
                if (msg.role === "user") {
                  return <UserBubble key={msg.id} content={msg.content} timestamp={msg.timestamp} />;
                }
                if (msg.role === "system") {
                  return (
                    <div key={msg.id} style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 11, color: "#ef4444", background: "#450a0a20", border: "1px solid #450a0a", padding: "4px 14px", borderRadius: 20 }}>
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                return <AgentBubble key={msg.id} msg={msg} onConfirm={looksGood} />;
              })
            )}

            {/* Loading indicator */}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0f172a", border: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={12} color="#475569" />
                </div>
                <div style={{ background: "#0c1220", border: "1px solid #1e293b", borderRadius: "2px 12px 12px 12px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: "50%", background: "#334155",
                        animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
                        display: "inline-block",
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: "12px 24px 20px", flexShrink: 0, borderTop: "1px solid #0c1220" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              background: "#0c1220", border: "1px solid #1e293b",
              borderRadius: 14, padding: "10px 10px 10px 16px",
              transition: "border-color .15s",
            }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "#334155")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "#1e293b")}
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="What are we shopping for today?"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  resize: "none", fontSize: 14, color: "#cbd5e1", fontFamily: "inherit",
                  lineHeight: 1.6, maxHeight: 120, overflowY: "auto",
                  scrollbarWidth: "none",
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: (input.trim() && !loading) ? "#1e3a5f" : "#0f172a",
                  border: `1px solid ${(input.trim() && !loading) ? "#2563eb" : "#1e293b"}`,
                  cursor: (input.trim() && !loading) ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}
              >
                <Send size={13} color={(input.trim() && !loading) ? "#3b82f6" : "#1e293b"} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#1e293b", padding: "0 2px" }}>
              <span>Enter ↵ to send · Shift+Enter for new line</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={10} />
                Smart Wallet · x402 · SKALE
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}