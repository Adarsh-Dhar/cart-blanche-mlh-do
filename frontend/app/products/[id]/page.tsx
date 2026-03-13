'use client'

import { useState, useRef, useEffect } from 'react'
import { useX402 } from '@/hooks/useX402'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Menu, Zap, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { TransactionReceipt } from '@/components/TransactionReceipt'
import { ProductListCard, type ProductListData } from '@/components/product-list-card'

interface Message {
  role: 'user' | 'assistant';
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intent?: any;
}

export default function ChatPage() {
  const { signMandate } = useX402();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Welcome to Cart Blanche! I am your AI Project Orchestrator. Whether you are outfitting your first day of school, planning a wedding, or organizing a hiking trip, tell me your goal and budget, and I will handle the rest.\n\n💡 **Tip:** You can guide me — e.g. *\"I want a premium backpack but cheap stationery\"*.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userId]    = useState("guest_user");
  const [sessionId] = useState("test-session-001");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Content cleaning ────────────────────────────────────────────────────────
  const cleanMessageContent = (content: string) => {
    if (!content) return "";

    if (content.includes("❌ Payment processor error:")) {
      return content.trim();
    }

    let cleaned = content;

    // Strip internal orchestrator tags
    cleaned = cleaned.replace(/For context:\[.*?\] said:\s*/g, '');
    cleaned = cleaned.replace(/<orchestrator>[\s\S]*?<\/orchestrator>/ig, '');
    if (cleaned.includes('<orchestrator>') && !cleaned.includes('</orchestrator>')) {
      cleaned = cleaned.replace(/<orchestrator>[\s\S]*/ig, '');
    }

    // Strip filler phrases added by LangChain
    cleaned = cleaned.replace(/Here is a proposed plan.*?:/ig, '');
    cleaned = cleaned.replace(/I will break down your request.*?:/ig, '');

    // Strip ALL markdown code blocks — product_list and receipts are rendered
    // as rich components; the raw JSON should never appear as text.
    cleaned = cleaned.replace(/```(?:json)?[\s\S]*?```/ig, '');

    // Strip trailing incomplete code block during streaming
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```(?:json)?[\s\S]*/ig, '');
    }

    // Strip leaked raw JSON that escaped the code fence
    cleaned = cleaned.replace(/\{\s*"total_budget_amount"[\s\S]*\}/g, '');
    cleaned = cleaned.replace(/\{"authorized":\s*true[\s\S]*?\}/g, '');

    // Strip MetaMask signature artefacts
    cleaned = cleaned.replace(/Here is my signature for the CartMandate: 0x[a-fA-F0-9]+/g, '');
    cleaned = cleaned.replace(/Signature received.*?(proceed|authorized)\.?/ig, '');
    cleaned = cleaned.replace(/The batch transaction is authorized.*?proceed\./ig, '');

    // Strip raw payment receipt text — let TransactionReceipt component handle it
    cleaned = cleaned.replace(/✅ \*\*Payment Complete!\*\*[\s\S]*?network\./ig, '');
    cleaned = cleaned.replace(/✅ Payment Complete![\s\S]*?network\./ig, '');

    // Collapse repeated sections
    cleaned = cleaned.replace(/([\s\S]{50,})\1+/g, '$1');

    if (cleaned.trim().toLowerCase() === "approve") return "";

    return cleaned.trim();
  };

  // ── Parse JSON payload from a message ──────────────────────────────────────
  function parseJsonPayload(text: string): any | null {
    // Try fenced block first
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced?.[1]) {
      try { return JSON.parse(fenced[1].trim()) } catch {}
    }
    // Fallback: bare JSON with a known key
    const bare = text.match(/(\{[\s\S]*?(tx_hash|receipts|type)[\s\S]*?\})/);
    if (bare?.[1]) {
      try { return JSON.parse(bare[1].trim()) } catch {}
    }
    return null;
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage(
    e?: React.FormEvent | React.KeyboardEvent,
    overrideText?: string,
    hideUserMessage?: boolean,
  ) {
    if (e) e.preventDefault();
    const userText = overrideText !== undefined ? overrideText : input.trim();
    if (!userText) return;

    setIsLoading(true);
    if (!hideUserMessage) {
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
    }
    setInput("");

    try {
      // Session pre-flight
      await fetch(
        `http://127.0.0.1:8000/apps/shopping_concierge/users/${userId}/sessions/${sessionId}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      ).catch(() => {});

      const response = await fetch("http://127.0.0.1:8000/run_sse", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify({
          app_name:    "shopping_concierge",
          user_id:     userId,
          session_id:  sessionId,
          new_message: { role: "user", parts: [{ text: userText }] },
        }),
      });

      if (!response.ok) throw new Error(`Backend Error ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAgentMessage = '';

      // Add assistant placeholder
      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr.trim() === '[DONE]') continue;

          try {
            const eventData = JSON.parse(dataStr);
            let textChunk: string = eventData?.content?.parts?.[0]?.text ?? '';
            if (!textChunk) continue;

            // De-duplicate echoed user message at start of stream
            if (userText.length > 5 && textChunk.includes(userText)) {
              textChunk = textChunk.replace(userText, '');
            }
            if (
              textChunk.length > 30 &&
              currentAgentMessage.includes(textChunk.substring(0, 25))
            ) continue;

            currentAgentMessage += textChunk;

            // ── Streaming display ──────────────────────────────────────
            // For product_list and settled TX: show full text (JSON rendered by component).
            // For mandate JSON: stop just before the code block so raw JSON never shows.
            let displayText = currentAgentMessage;

            const isProductList =
              displayText.includes('"type": "product_list"') ||
              displayText.includes('"type":"product_list"');
            const isSettled =
              displayText.toLowerCase().includes("settled") ||
              displayText.includes("tx_hash");

            if (!isProductList && !isSettled) {
              const stopJson = displayText.indexOf('```json');
              const stopEIP  = displayText.indexOf('Please sign the EIP-712');
              if (stopJson !== -1) {
                displayText = displayText.substring(0, stopJson).trim();
              } else if (stopEIP !== -1) {
                displayText = displayText.substring(0, stopEIP).trim();
              }
            }

            setMessages(prev => {
              const arr = [...prev];
              arr[arr.length - 1] = { ...arr[arr.length - 1], text: displayText };
              return arr;
            });
          } catch {}
        }
      }

      // ── After stream: store FULL message so JSON detection works ──────
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = { ...arr[arr.length - 1], text: currentAgentMessage };
        return arr;
      });

      // ── Check for mandate JSON (triggers MetaMask signing) ────────────
      let mandatePayload: any = null;
      const parsed = parseJsonPayload(currentAgentMessage);

      if (
        parsed &&
        !parsed.tx_hash &&
        !parsed.receipts &&
        parsed.type !== 'product_list'
      ) {
        mandatePayload = parsed;
      }

      if (mandatePayload?.cart_mandate) mandatePayload = mandatePayload.cart_mandate;

      if (mandatePayload) {
        const rawMsg = mandatePayload.message || mandatePayload;
        let extractedAddress = rawMsg.merchant_address || rawMsg.merchant;
        if (!extractedAddress || !extractedAddress.startsWith('0x')) {
          extractedAddress = "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9";
        }
        let extractedAmount = rawMsg.amount || rawMsg.total_budget_amount || 0;
        if (typeof extractedAmount === 'string') {
          extractedAmount = parseFloat(extractedAmount.replace(/[^0-9.]/g, '')) || 0;
        }

        mandatePayload = {
          domain: { name: "CartBlanche", version: "1", chainId: 324705682 },
          types: {
            CartMandate: [
              { name: "merchant_address", type: "address" },
              { name: "amount",           type: "uint256" },
              { name: "currency",         type: "string"  },
            ],
          },
          primaryType: "CartMandate",
          message: {
            merchant_address: extractedAddress,
            amount:           extractedAmount,
            currency:         rawMsg.currency || "USDC",
            merchants:        rawMsg.merchants || [],
          },
        };
      }

      if (mandatePayload?.domain) {
        setTimeout(async () => {
          try {
            const signature = await signMandate(mandatePayload);
            await sendMessage(
              undefined,
              `Here is my signature for the CartMandate: ${signature}`,
              true,
            );
          } catch {
            setMessages(prev => [
              ...prev,
              { role: 'assistant', text: '❌ Payment signature was cancelled.' },
            ]);
          }
        }, 500);
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: `⚠️ ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-card rounded transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">Shopping Assistant</h1>
              <p className="text-xs text-muted-foreground">AI-powered shopping concierge</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card className="border-border/50 bg-card/50 p-4 border-l-2 border-l-primary">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">How it works</p>
                <p className="text-xs text-muted-foreground">
                  Tell me what you need and your budget. Mention preferences like
                  <em> "premium backpack but cheap stationery"</em> and I'll adjust
                  selections accordingly.
                </p>
              </div>
            </div>
          </Card>

          {messages.map((message, idx) => {
            const cleanedText = cleanMessageContent(message.text);

            // ── Determine which rich component to render ──────────────
            let receipt:     any              = null;
            let productList: ProductListData | null = null;

            if (message.role === 'assistant') {
              const parsed = parseJsonPayload(message.text);
              if (parsed) {
                if (parsed.type === 'product_list') {
                  productList = parsed as ProductListData;
                } else if (parsed.receipts || parsed.tx_hash) {
                  receipt = parsed;
                }
              }
            }

            // Hide blank assistant messages that aren't rich
            if (!cleanedText && message.role !== 'user' && !receipt && !productList) {
              return null;
            }

            return (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[88%] w-full ${
                  message.role === 'user'
                    ? 'max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-3'
                    : 'bg-transparent'
                }`}>
                  {message.role === 'user' ? (

                    /* ── User bubble ── */
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>

                  ) : receipt ? (

                    /* ── Transaction receipt ── */
                    <TransactionReceipt receipt={receipt} />

                  ) : (

                    /* ── Assistant: text + optional product cards ── */
                    <div className="w-full space-y-1">
                      {cleanedText && (
                        <div className="
                          [&_ol]:border [&_ol]:border-border/60 [&_ol]:bg-card [&_ol]:rounded-xl
                          [&_ol]:overflow-hidden [&_ol]:my-4 [&_ol]:list-none [&_ol]:p-0
                          [&_ol]:divide-y [&_ol]:divide-border/50 [&_ol]:shadow-sm
                          [&_ol>li]:px-4 [&_ol>li]:py-3 hover:[&_ol>li]:bg-muted/30
                          [&_ol>li_strong]:text-sm [&_ol>li_strong]:font-bold [&_ol>li_strong]:block
                          [&_ul]:flex [&_ul]:flex-wrap [&_ul]:items-center [&_ul]:gap-x-1
                          [&_ul]:text-xs [&_ul]:text-muted-foreground [&_ul]:list-none
                          [&_ul]:p-0 [&_ul]:m-0 [&_ul]:mt-1.5
                          [&_ul>li:not(:first-child)]:before:content-['•'] [&_ul>li:not(:first-child)]:before:mx-2
                          [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-3
                        ">
                          <ReactMarkdown
                            components={{
                              a: ({ ...props }) => (
                                <a
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 bg-secondary/50
                                    text-secondary-foreground hover:bg-secondary text-xs font-medium
                                    rounded-md transition-colors whitespace-nowrap"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  {...props}
                                >
                                  {props.children}
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              ),
                            }}
                          >
                            {cleanedText}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* ── Product list card ── */}
                      {productList && (
                        <ProductListCard
                          data={productList}
                          onConfirm={() =>
                            sendMessage(undefined, "Looks good", false)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/50 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm p-4">
          <Card className="border-border/50 bg-card/50 p-1 flex gap-1">
            <Input
              placeholder="Describe what you need, or refine: 'premium backpack, budget stationery'…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e); }}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}