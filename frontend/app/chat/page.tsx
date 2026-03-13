// frontend/app/chat/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Check, Bot, Wallet, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TransactionReceipt } from "@/components/TransactionReceipt";
import MarkdownProductCards from "./MarkdownProductCards";
import { ProductListCard, type ProductListData } from "./ProductListCard";

import { useMetaMask } from "@/hooks/use-metamask";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agentName?: string;
  status?: "streaming" | "complete" | "error";
  receipt?: any;
}

interface GraphState {
  _orchestrated: boolean;
  _shopped: boolean;
  _merchant_reviewed: boolean;
  _mandate_generated: boolean;
  _payment_confirmed: boolean;
}

// ── Parse a product_list JSON block out of a message string ──────────────────
function parseProductList(content: string): ProductListData | null {
  // Try fenced ```json block first
  const fenced = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const raw = fenced?.[1] ?? content;
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed?.type === "product_list" && Array.isArray(parsed.products)) {
      return parsed as ProductListData;
    }
  } catch {}
  // Also try bare JSON blob anywhere in the string
  const bareMatch = content.match(/(\{[\s\S]*"type"\s*:\s*"product_list"[\s\S]*\})/);
  if (bareMatch?.[1]) {
    try {
      const parsed = JSON.parse(bareMatch[1]);
      if (parsed?.type === "product_list") return parsed as ProductListData;
    } catch {}
  }
  return null;
}

// ── Strip the JSON block from display text so it doesn't render raw ──────────
function stripJsonBlock(content: string): string {
  // Remove fenced block
  let s = content.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
  // Remove bare JSON that starts with {
  s = s.replace(/\{[\s\S]*"type"\s*:\s*"product_list"[\s\S]*\}/, "").trim();
  return s;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `sess-${Math.random().toString(36).substr(2, 9)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [graphState, setGraphState] = useState<GraphState>({
    _orchestrated: false,
    _shopped: false,
    _merchant_reviewed: false,
    _mandate_generated: false,
    _payment_confirmed: false,
  });

  const { isConnected, address, signMessage } = useMetaMask();
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handlePayment = async (mandate: any) => {
    if (!isConnected || !address) {
      toast({ title: "Wallet not connected", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const signature = await signMessage(JSON.stringify(mandate));
      if (!signature) throw new Error("Signature failed");

      const response = await fetch("http://localhost:8001/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, mandate }),
      });

      const receipt = await response.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        agentName: "SettlementAgent",
        content: "Payment settled successfully. Here is your receipt:",
        timestamp: new Date(),
        receipt,
        status: "complete",
      }]);
      setGraphState(prev => ({ ...prev, _payment_confirmed: true }));
    } catch (err) {
      toast({ title: "Payment failed", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Called by ProductListCard "Looks Good" button
  const handleLooksGood = async () => {
    setIsLoading(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: "Looks good",
      timestamp: new Date(),
      status: "complete",
    }]);

    try {
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: "Looks good" }),
      });
      if (!res.body) throw new Error("No response body");
      await streamResponse(res, "Looks good");
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "system",
        content: `Error: ${err.message}`, timestamp: new Date(), status: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Shared streaming reader
  const streamResponse = async (res: Response, _userText: string) => {
    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();
    let currentContent = "";
    let currentAgent   = "Agent1";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr || dataStr === "[DONE]") continue;

        try {
          const data = JSON.parse(dataStr);

          if (data.type === "state_update") {
            setGraphState(prev => ({ ...prev, ...data.state }));
            continue;
          }

          if (data.agent) currentAgent = data.agent;

          if (data.content) {
            const textChunk = data?.content?.parts?.[0]?.text;
            if (!textChunk) continue;
            currentContent += textChunk;

            // During streaming: hide JSON block to avoid flash of raw text
            const displayText = currentContent.includes('"type": "product_list"') || currentContent.includes('"type":"product_list"')
              ? stripJsonBlock(currentContent)
              : currentContent.replace(/```json[\s\S]*$/, "");  // hide partial fence

            setMessages(prev => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant" && last.status === "streaming" && last.agentName === currentAgent) {
                last.content = displayText || currentContent;
                // Store full content in a data attribute so we can parse after stream ends
                (last as any)._fullContent = currentContent;
              } else {
                arr.push({
                  id: Date.now().toString(),
                  role: "assistant",
                  agentName: currentAgent,
                  content: displayText || currentContent,
                  timestamp: new Date(),
                  status: "streaming",
                  ...(({ _fullContent: currentContent }) as any),
                });
                (arr[arr.length - 1] as any)._fullContent = currentContent;
              }
              return arr;
            });
          }

          if (data.type === "end") {
            setMessages(prev => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last?.role === "assistant") {
                // Restore full content so parseProductList can find the JSON
                last.content = (last as any)._fullContent ?? last.content;
                last.status  = "complete";
              }
              return arr;
            });
            currentContent = "";
          }
        } catch {}
      }
    }

    // Final flush — ensure last message has full content
    setMessages(prev => {
      const arr = [...prev];
      const last = arr[arr.length - 1];
      if (last?.role === "assistant") {
        last.content = (last as any)._fullContent ?? currentContent ?? last.content;
        last.status  = "complete";
      }
      return arr;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: "user",
      content: userText, timestamp: new Date(), status: "complete",
    }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userText }),
      });
      if (!res.body) throw new Error("No response body");
      await streamResponse(res, userText);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: "system",
        content: "Failed to connect to the agent. Is the backend running?",
        timestamp: new Date(), status: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentIcon = (agentName?: string) => {
    switch (agentName) {
      case "Orchestrator":   return <Search    className="w-5 h-5 text-indigo-500" />;
      case "ShoppingAgent":  return <Bot       className="w-5 h-5 text-emerald-500" />;
      case "Merchant":       return <Wallet    className="w-5 h-5 text-amber-500" />;
      case "SettlementAgent":return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      default:               return <Bot       className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background w-full">
      <main className="flex-1 flex overflow-hidden">

        {/* Left Side: Status Pipeline */}
        <div className="w-80 bg-muted/20 border-r border-border p-6 hidden md:flex flex-col z-10">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-8">Execution Pipeline</h2>
          <div className="relative flex-1">
            <div className="absolute left-4 top-4 bottom-8 w-0.5 bg-border" />
            <div className="space-y-8 relative">
              <StepItem active={graphState._orchestrated}     title="1. Intent Extraction" desc="Orchestrator analyzes request & budget" />
              <StepItem active={graphState._shopped}          title="2. Product Search"    desc="Shopping Agent queries live inventory" />
              <StepItem active={graphState._merchant_reviewed}title="3. Cart Optimization" desc="Merchant selects best value options" />
              <StepItem active={graphState._mandate_generated}title="4. Mandate Generation"desc="Cryptographic vault signs payment request" />
              <StepItem active={graphState._payment_confirmed}title="5. Settlement"        desc="X402 Protocol confirms final transaction" isLast />
            </div>
          </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-8 pb-10">

              {messages.length === 0 ? (
                <div className="text-center mt-20 p-8 flex flex-col items-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 border border-primary/20">
                    <Bot className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Cart-Blanche Nova</h2>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Describe what you need. I'll analyze intent, search live inventory, optimize your cart, and handle crypto-settlement securely.
                  </p>
                  <div className="mt-8 flex gap-3 justify-center flex-wrap">
                    <Badge variant="secondary" className="px-4 py-2 text-sm font-normal cursor-pointer hover:bg-muted transition-colors border border-border" onClick={() => setInput("Buy me stuff i need for my first day of school under $800")}>
                      "Back to school $800"
                    </Badge>
                    <Badge variant="secondary" className="px-4 py-2 text-sm font-normal cursor-pointer hover:bg-muted transition-colors border border-border" onClick={() => setInput("Buy me camping gear")}>
                      "Buy me camping gear"
                    </Badge>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  // ── Determine render mode ──────────────────────────────────
                  const productList = msg.role === "assistant" && msg.status === "complete"
                    ? parseProductList(msg.content)
                    : null;
                  const displayText = productList
                    ? stripJsonBlock(msg.content)
                    : msg.content;

                  return (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.role !== "user" && (
                        <Avatar className="w-10 h-10 border border-border bg-card flex items-center justify-center p-2 mt-1">
                          {getAgentIcon(msg.agentName)}
                        </Avatar>
                      )}

                      <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === "user" ? "items-end" : ""} ${productList ? "w-full max-w-full" : ""}`}>
                        {msg.role !== "user" && (
                          <div className="flex items-center gap-2 pl-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{msg.agentName || "System"}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        )}

                        {/* User bubble */}
                        {msg.role === "user" ? (
                          <Card className="border-none shadow-sm bg-primary text-primary-foreground rounded-2xl rounded-tr-sm">
                            <CardContent className="p-4 text-[15px] leading-relaxed">
                              {msg.content}
                            </CardContent>
                          </Card>

                        /* Transaction receipt */
                        ) : msg.receipt ? (
                          <Card className="border-none shadow-sm bg-muted/40 rounded-2xl rounded-tl-sm border border-border w-full">
                            <CardContent className="p-4">
                              <TransactionReceipt receipt={msg.receipt} />
                            </CardContent>
                          </Card>

                        /* Product list card */
                        ) : productList ? (
                          <div className="w-full space-y-3">
                            {displayText && (
                              <Card className="border-none shadow-sm bg-muted/40 rounded-2xl rounded-tl-sm border border-border">
                                <CardContent className="p-4 text-[15px] leading-relaxed">
                                  <MarkdownProductCards>{displayText}</MarkdownProductCards>
                                </CardContent>
                              </Card>
                            )}
                            <ProductListCard data={productList} onConfirm={handleLooksGood} />
                          </div>

                        /* Normal assistant text */
                        ) : (
                          <Card className="border-none shadow-sm bg-muted/40 rounded-2xl rounded-tl-sm border border-border">
                            <CardContent className="p-4 text-[15px] leading-relaxed">
                              <MarkdownProductCards>{msg.content}</MarkdownProductCards>
                              {msg.status === "streaming" && (
                                <span className="inline-block w-1.5 h-4 ml-1 bg-primary/60 animate-pulse align-middle" />
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-4">
                  <Avatar className="w-10 h-10 border border-border bg-card flex items-center justify-center mt-1">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </Avatar>
                  <div className="bg-muted/40 border border-border p-4 rounded-2xl rounded-tl-sm shadow-sm w-24 flex justify-center items-center h-[52px]">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-background border-t border-border">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What are we shopping for today?"
                className="pr-14 py-6 text-base rounded-xl border-border focus-visible:ring-primary focus-visible:border-primary bg-muted/30 hover:bg-muted/50 transition-colors"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 rounded-lg bg-primary hover:opacity-90 h-10 w-10 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            </form>
            <div className="max-w-4xl mx-auto mt-3 flex justify-between items-center text-xs text-muted-foreground font-medium px-1">
              <span>Press <kbd className="font-sans px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd> to send</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/60" />
                Secure x402 End-to-End
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepItem({ active, title, desc, isLast }: { active: boolean; title: string; desc: string; isLast?: boolean }) {
  return (
    <div className="relative flex gap-4 z-10">
      <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 ${
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-muted-foreground"
      }`}>
        {active ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-border" />}
      </div>
      <div>
        <div className={`font-semibold text-[15px] transition-colors duration-300 ${active ? "text-foreground" : "text-muted-foreground"}`}>{title}</div>
        <div className={`text-xs mt-1 font-medium transition-colors duration-300 ${active ? "text-muted-foreground" : "text-muted-foreground/50"}`}>{desc}</div>
      </div>
    </div>
  );
}