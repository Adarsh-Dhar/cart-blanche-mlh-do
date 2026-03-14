'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, User, Bot, MessageSquare } from 'lucide-react'
import { Btn, Toast } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface TimelineItem {
  role: 'user' | 'agent'
  id: string
  type: string
  text: string
  timestamp: string
  linkedResponseId?: string | null
  linkedRequestId?: string | null
}

interface ChatDetail {
  id: string
  startTime: string
  lastUpdated: string
  userRequests: any[]
  agentResponses: any[]
  timeline: TimelineItem[]
}

const TYPE_COLORS: Record<string, string> = {
  DISCOVERY:   '#00b4d8',
  AFFIRMATION: '#10b981',
  SIGNATURE:   '#f59e0b',
  PLAN:        '#8b5cf6',
  PRODUCT_LIST:'#00ff9d',
  MANDATE:     '#f59e0b',
  RECEIPT:     '#10b981',
}

function tryParseJson(text: string): string {
  // If the text is a JSON payload, pretty-print the key fields for display
  try {
    const parsed = JSON.parse(text)
    if (parsed.type === 'product_list') {
      return `Product list: ${parsed.products?.length ?? 0} items · $${parsed.total}`
    }
    if (parsed.type === 'cart_mandate') {
      return `Cart mandate: $${parsed.amount} USDC · ${parsed.merchants?.length ?? 0} vendor(s)`
    }
    if (parsed.type === 'PLAN') {
      return `Plan: ${parsed.plan} | Budget: $${parsed.budget}`
    }
    if (parsed.receipts) {
      return `Receipt: ${parsed.receipts.length} TX · ${parsed.details || ''}`
    }
  } catch {}
  // Fallback: just truncate
  return text.length > 200 ? text.slice(0, 197) + '…' : text
}

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [chat, setChat]     = useState<ChatDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/chats/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChat(data.data)
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!confirm('Delete this entire chat session?')) return
    try {
      const res  = await fetch(`${API}/api/chats/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin/chats')
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>Loading…</div>
  )
  if (!chat) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link href="/admin/chats" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ArrowLeft size={13} /> Chats
        </Link>
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>{chat.id.slice(0, 16)}…</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ Chat Session</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace', margin: 0 }}>{chat.id}</h1>
          <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '6px' }}>
            Started {new Date(chat.startTime).toLocaleString()} · {chat.userRequests.length} requests · {chat.agentResponses.length} responses
          </div>
        </div>
        <Btn variant="danger" onClick={handleDelete}><Trash2 size={14} /> Delete Session</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'User Requests',    value: chat.userRequests.length,  color: '#00b4d8' },
          { label: 'Agent Responses',  value: chat.agentResponses.length, color: '#8b5cf6' },
          { label: 'Total Turns',      value: chat.timeline.length,       color: '#00ff9d' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0d1117', border: `1px solid ${color}22`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a2332' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conversation Timeline</div>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chat.timeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#4a5568' }}>No messages recorded</div>
          ) : chat.timeline.map((item) => {
            const isUser    = item.role === 'user'
            const color     = TYPE_COLORS[item.type] || '#64748b'
            const isExpanded= expanded[item.id]
            const isJson    = item.text.startsWith('{') || item.text.startsWith('```')
            const display   = isJson ? tryParseJson(item.text.replace(/```json\n?/g,'').replace(/```/g,'').trim()) : item.text

            return (
              <div key={item.id} style={{
                display: 'flex', gap: '12px',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: isUser ? '#00b4d820' : '#8b5cf620',
                  border: `1px solid ${isUser ? '#00b4d840' : '#8b5cf640'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isUser ? <User size={14} color="#00b4d8" /> : <Bot size={14} color="#8b5cf6" />}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: '70%', minWidth: '120px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: color + '20', color }}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: '10px', color: '#4a5568', fontFamily: 'monospace' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div
                    style={{
                      background: isUser ? '#00b4d815' : '#1a1f2e',
                      border: `1px solid ${isUser ? '#00b4d830' : '#2d3748'}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      lineHeight: 1.6,
                      cursor: isJson ? 'pointer' : 'default',
                    }}
                    onClick={() => isJson && setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}
                  >
                    {isExpanded ? (
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>
                        {item.text.replace(/```json\n?/g,'').replace(/```/g,'').trim()}
                      </pre>
                    ) : display}
                    {isJson && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#4a5568' }}>
                        {isExpanded ? '▲ collapse' : '▼ expand JSON'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}