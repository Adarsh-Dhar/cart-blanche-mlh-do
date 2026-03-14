'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react'

interface ChatPreview {
  id: string
  name: string
  startTime: string
  lastUpdated: string
  _count: { userRequests: number; agentResponses: number }
  userRequests: { id: string; type: string; text: string; timestamp: string }[]
}

interface ChatSidebarProps {
  currentSessionId: string
  onNewChat: () => void
  onSelectChat: (sessionId: string) => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

function groupByDate(chats: ChatPreview[]): { label: string; chats: ChatPreview[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const groups: Record<string, ChatPreview[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  }

  for (const chat of chats) {
    const d = new Date(chat.lastUpdated)
    if (d >= today) groups['Today'].push(chat)
    else if (d >= yesterday) groups['Yesterday'].push(chat)
    else if (d >= weekAgo) groups['This Week'].push(chat)
    else if (d >= monthAgo) groups['This Month'].push(chat)
    else groups['Older'].push(chat)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, chats]) => ({ label, chats }))
}

export function ChatSidebar({ currentSessionId, onNewChat, onSelectChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (reset = false) => {
    if (reset) setPage(1)
    const p = reset ? 1 : page
    try {
      const res = await fetch(`/api/chats?page=${p}&limit=30`)
      console.log("Fetched chats page", p, res)
      const data = await res.json()
      const incoming: ChatPreview[] = data.data || []
      setChats(prev => reset ? incoming : [...prev, ...incoming])
      setHasMore((data.meta?.totalPages || 1) > p)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load(true) }, [])

  // Poll for new chats every 5s when active
  useEffect(() => {
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' })
      setChats(prev => prev.filter(c => c.id !== id))
      if (currentSessionId === id) onNewChat()
    } finally {
      setDeletingId(null)
    }
  }

  const groups = groupByDate(chats)

  return (
    <div
      style={{
        width: collapsed ? '56px' : '260px',
        minWidth: collapsed ? '56px' : '260px',
        height: '100%',
        background: '#080c10',
        borderRight: '1px solid #1a2332',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{
        padding: collapsed ? '16px 10px' : '16px 14px',
        borderBottom: '1px solid #1a2332',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#4a5568',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Conversations
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            title="New Chat"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: collapsed ? '8px' : '7px 10px',
              background: 'linear-gradient(135deg, hsl(66,100%,50%,0.15), hsl(66,100%,50%,0.08))',
              border: '1px solid hsl(66,100%,50%,0.4)',
              borderRadius: '8px',
              color: 'hsl(66,100%,50%)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, hsl(66,100%,50%,0.25), hsl(66,100%,50%,0.15))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, hsl(66,100%,50%,0.15), hsl(66,100%,50%,0.08))')}
          >
            <Plus size={14} strokeWidth={2.5} />
            {!collapsed && <span>New Chat</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              background: 'transparent',
              border: '1px solid #1a2332',
              borderRadius: '7px',
              color: '#4a5568',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d3748'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a2332'; (e.currentTarget as HTMLElement).style.color = '#4a5568' }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </div>

      {/* Chat List */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  height: '52px',
                  background: '#0d1117',
                  borderRadius: '8px',
                  animation: 'shimmer 1.5s infinite',
                  opacity: 1 - i * 0.12,
                }} />
              ))}
              <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
            </div>
          ) : chats.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 16px',
              gap: '12px',
              color: '#2d3748',
            }}>
              <MessageSquare size={32} strokeWidth={1} />
              <p style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.5, color: '#4a5568' }}>
                No conversations yet.<br />Start a new chat!
              </p>
            </div>
          ) : (
            groups.map(({ label, chats: groupChats }) => (
              <div key={label} style={{ marginBottom: '4px' }}>
                {/* Group Label */}
                <div style={{
                  padding: '8px 8px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#2d3748',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>
                  {label}
                </div>

                {groupChats.map(chat => {
                  const isActive = chat.id === currentSessionId
                  const firstMsg = chat.userRequests?.[0]
                  const preview = chat 
                  const isDeleting = deletingId === chat.id
                  const isHovered = hoveredId === chat.id

                  return (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      onMouseEnter={() => setHoveredId(chat.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '9px 10px',
                        marginBottom: '2px',
                        borderRadius: '9px',
                        cursor: 'pointer',
                        background: isActive
                          ? 'linear-gradient(135deg, hsl(66,100%,50%,0.1), hsl(66,100%,50%,0.05))'
                          : isHovered
                            ? '#0d1117'
                            : 'transparent',
                        border: isActive
                          ? '1px solid hsl(66,100%,50%,0.25)'
                          : '1px solid transparent',
                        transition: 'all 0.1s',
                        opacity: isDeleting ? 0.4 : 1,
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        background: isActive ? 'hsl(66,100%,50%,0.15)' : '#1a2332',
                        border: `1px solid ${isActive ? 'hsl(66,100%,50%,0.3)' : '#2d3748'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}>
                        <MessageSquare
                          size={13}
                          color={isActive ? 'hsl(66,100%,50%)' : '#4a5568'}
                          strokeWidth={1.5}
                        />
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#e2e8f0' : isHovered ? '#94a3b8' : '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                          transition: 'color 0.1s',
                        }}>
                          {chat.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '3px',
                        }}>
                          <Clock size={9} color="#2d3748" />
                          <span style={{
                            fontSize: '10px',
                            color: '#2d3748',
                          }}>
                            {timeAgo(chat.lastUpdated)}
                          </span>
                          <span style={{ color: '#1a2332', fontSize: '10px' }}>·</span>
                          <span style={{ fontSize: '10px', color: '#2d3748' }}>
                            {chat._count.userRequests} msg{chat._count.userRequests !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Delete button (shown on hover) */}
                      {(isHovered || isActive) && (
                        <button
                          onClick={e => handleDelete(e, chat.id)}
                          disabled={isDeleting}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            background: '#ef444415',
                            border: '1px solid #ef444430',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            opacity: isDeleting ? 0.5 : 1,
                            transition: 'all 0.1s',
                            flexShrink: 0,
                          }}
                        >
                          {isDeleting
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Trash2 size={11} />
                          }
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <button
              onClick={() => { setPage(p => p + 1); load() }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: '1px solid #1a2332',
                borderRadius: '8px',
                color: '#4a5568',
                cursor: 'pointer',
                fontSize: '11px',
                marginTop: '4px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2d3748')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2332')}
            >
              Load more
            </button>
          )}
        </div>
      )}

      {/* Collapsed state — just icons */}
      {collapsed && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 0',
          gap: '4px',
          overflowY: 'auto',
        }}>
          {chats.slice(0, 12).map(chat => {
            const isActive = chat.id === currentSessionId
            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                title={chat.userRequests?.[0]?.text || 'Chat'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: `1px solid ${isActive ? 'hsl(66,100%,50%,0.4)' : '#1a2332'}`,
                  background: isActive ? 'hsl(66,100%,50%,0.1)' : 'transparent',
                  color: isActive ? 'hsl(66,100%,50%)' : '#4a5568',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2d3748' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#1a2332' }}
              >
                <MessageSquare size={14} strokeWidth={1.5} />
              </button>
            )
          })}
        </div>
      )}

      {/* Bottom border glow when active */}
      {!collapsed && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid #1a2332',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'hsl(66,100%,50%)',
            boxShadow: '0 0 8px hsl(66,100%,50%,0.8)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.05em' }}>
            {chats.length} session{chats.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}