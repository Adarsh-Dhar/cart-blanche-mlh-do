// frontend/app/chat/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, ChevronDown, CheckCircle2, Check, ExternalLink, Bot, Wallet, Download, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TransactionReceipt } from "@/components/TransactionReceipt";
import MarkdownProductCards from "./MarkdownProductCards"; // <-- FIXED IMPORT
import {useMetaMask} from "@/hooks/use-metamask";
import Header from "@/components/header";
import { useX402 } from "@/hooks/useX402";
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

  const { isConnected, address, connect, signMessage } = useMetaMask();
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        body: JSON.stringify({
          address: address,
          signature: signature,
          mandate: mandate
        })
      });
      
      const receipt = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          agentName: "SettlementAgent",
          content: "Payment settled successfully. Here is your receipt:",
          timestamp: new Date(),
          receipt: receipt,
          status: "complete"
        }
      ]);
      
      setGraphState(prev => ({ ...prev, _payment_confirmed: true }));

    } catch (err) {
      toast({ title: "Payment failed", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      status: "complete",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          text: userMsg.content,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let currentContent = "";
      let currentAgent = "Agent";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === "state_update") {
                setGraphState(prev => ({ ...prev, ...data.state }));
                if (data.state.cart_mandate && !data.state._payment_confirmed) {
                  handlePayment(data.state.cart_mandate);
                }
                continue;
              }

              if (data.agent) {
                currentAgent = data.agent;
              }

              if (data.content) {
                currentContent += data.content;
                
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = newMsgs[newMsgs.length - 1];
                  
                  if (lastMsg && lastMsg.role === "assistant" && lastMsg.status === "streaming" && lastMsg.agentName === currentAgent) {
                    lastMsg.content = currentContent;
                  } else {
                    newMsgs.push({
                      id: Date.now().toString(),
                      role: "assistant",
                      agentName: currentAgent,
                      content: currentContent,
                      timestamp: new Date(),
                      status: "streaming"
                    });
                  }
                  return newMsgs;
                });
              }

              if (data.type === "end") {
                 setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                        lastMsg.status = "complete";
                    }
                    return newMsgs;
                 });
                 currentContent = "";
              }

            } catch (e) {
              console.error("Parse error:", e, dataStr);
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: "Failed to connect to the agent. Is the backend running?",
          timestamp: new Date(),
          status: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentIcon = (agentName?: string) => {
    switch (agentName) {
      case "Orchestrator": return <Search className="w-5 h-5 text-indigo-500" />;
      case "ShoppingAgent": return <Bot className="w-5 h-5 text-emerald-500" />;
      case "Merchant": return <Wallet className="w-5 h-5 text-amber-500" />;
      case "SettlementAgent": return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      default: return <Bot className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Status Pipeline */}
        <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm z-10">
          <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-8">Execution Pipeline</h2>
          
          <div className="relative flex-1">
            {/* Pipeline vertical line */}
            <div className="absolute left-4 top-4 bottom-8 w-0.5 bg-slate-100" />
            
            <div className="space-y-8 relative">
              <StepItem
                active={graphState._orchestrated}
                title="1. Intent Extraction"
                desc="Orchestrator analyzes request & budget"
              />
              <StepItem
                active={graphState._shopped}
                title="2. Product Search"
                desc="Shopping Agent queries live inventory"
              />
              <StepItem
                active={graphState._merchant_reviewed}
                title="3. Cart Optimization"
                desc="Merchant selects best value options"
              />
              <StepItem
                active={graphState._mandate_generated}
                title="4. Mandate Generation"
                desc="Cryptographic vault signs payment request"
              />
               <StepItem
                active={graphState._payment_confirmed}
                title="5. Settlement"
                desc="X402 Protocol confirms final transaction"
                isLast
              />
            </div>
          </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 mt-20 p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 mb-4 shadow-sm border border-indigo-100">
                    <Bot className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Cart-Blanche Nova</h2>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    Describe what you need. I'll analyze intent, search live inventory, optimize your cart, and handle crypto-settlement securely.
                  </p>
                  <div className="mt-8 flex gap-3 justify-center">
                    <Badge variant="secondary" className="px-3 py-1.5 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setInput("Build me a home office setup under $800")}>
                      "Home office under $800"
                    </Badge>
                     <Badge variant="secondary" className="px-3 py-1.5 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setInput("Buy me camping gear")}>
                      "Buy me camping gear"
                    </Badge>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                    
                    {msg.role !== "user" && (
                      <Avatar className="w-10 h-10 border border-slate-200 bg-white shadow-sm flex items-center justify-center p-2 mt-1">
                        {getAgentIcon(msg.agentName)}
                      </Avatar>
                    )}

                    <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
                       
                       {msg.role !== "user" && (
                          <div className="flex items-center gap-2 pl-1">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{msg.agentName || "System"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                       )}

                      <Card className={`border-none shadow-sm ${
                        msg.role === "user" 
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                          : "bg-white rounded-2xl rounded-tl-sm border border-slate-100"
                      }`}>
                        <CardContent className="p-4 text-[15px] leading-relaxed">
                           {msg.role === "user" ? (
                              msg.content
                           ) : msg.receipt ? (
                              <TransactionReceipt receipt={msg.receipt} />
                           ) : (
                             // RENDER MARKDOWN TABLES AS UI CARDS
                              <MarkdownProductCards children={msg.content}  />
                           )}
                           
                           {msg.status === "streaming" && (
                             <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                           )}
                        </CardContent>
                      </Card>
                    </div>

                  </div>
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-4">
                  <Avatar className="w-10 h-10 border border-slate-200 bg-white shadow-sm flex items-center justify-center mt-1">
                     <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </Avatar>
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-sm shadow-sm w-24 flex justify-center items-center h-[52px]">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-white border-t border-slate-200">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center shadow-sm">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What are we shopping for today?"
                className="pr-14 py-6 text-base rounded-xl border-slate-300 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 bg-slate-50 hover:bg-white transition-colors"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || !input.trim()} 
                className="absolute right-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 h-10 w-10 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="max-w-4xl mx-auto mt-3 flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>Press <kbd className="font-sans px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">Enter</kbd> to send</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure x402 End-to-End
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepItem({ active, title, desc, isLast }: { active: boolean, title: string, desc: string, isLast?: boolean }) {
  return (
    <div className="relative flex gap-4 z-10">
      <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white transition-colors duration-500 ${
        active 
          ? "border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
          : "border-slate-200 text-slate-300"
      }`}>
        {active ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-slate-200" />}
      </div>
      <div>
        <div className={`font-semibold text-[15px] transition-colors duration-300 ${active ? "text-slate-800" : "text-slate-400"}`}>
          {title}
        </div>
        <div className={`text-xs mt-1 font-medium transition-colors duration-300 ${active ? "text-slate-500" : "text-slate-300"}`}>
          {desc}
        </div>
      </div>
    </div>
  );
}