'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Trash2, RefreshCw, ChevronRight } from 'lucide-react'
import { Btn, Toast, EmptyState, PageHeader, Table, Pagination } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Chat {
  id: string
  startTime: string
  lastUpdated: string
  _count: { userRequests: number; agentResponses: number }
  userRequests: { id: string; type: string; text: string; timestamp: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  DISCOVERY:  '#00b4d8',
  AFFIRMATION:'#10b981',
  SIGNATURE:  '#f59e0b',
  PLAN:       '#8b5cf6',
  PRODUCT_LIST:'#00ff9d',
  MANDATE:    '#f59e0b',
  RECEIPT:    '#10b981',
}

export default function ChatsAdminPage() {
  const router = useRouter()
  const [chats, setChats]       = useState<Chat[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]       = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/chats?page=${page}&limit=20`)
      const data = await res.json()
      setChats(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
      setTotal(data.meta?.total || 0)
    } catch {
      setToast({ msg: 'Failed to load chats', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this chat and all its messages?')) return
    setDeletingId(id)
    try {
      const res  = await fetch(`${API}/api/chats/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Chat deleted', type: 'success' })
      load()
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  const preview = (text: string) =>
    text.length > 80 ? text.slice(0, 77) + '…' : text

  return (
    <div>
      <PageHeader
        title="Chat Sessions"
        subtitle={`${total} recorded conversations`}
        action={
          <Btn variant="ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Btn>
        }
      />

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <Table
          headers={['Chat ID', 'First Message', 'Turns', 'Started', 'Last Updated', 'Actions']}
          loading={loading}
        >
          {chats.length === 0 && !loading ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No chat sessions recorded yet. Start a conversation in the /chat page." />
              </td>
            </tr>
          ) : chats.map((chat) => {
            const firstMsg = chat.userRequests?.[0]
            return (
              <tr
                key={chat.id}
                style={{ borderBottom: '1px solid #1a233240', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => router.push(`/admin/chats/${chat.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00ff9d', background: '#00ff9d10', padding: '3px 8px', borderRadius: '4px' }}>
                    {chat.id.slice(0, 12)}…
                  </span>
                </td>
                <td style={{ padding: '14px', maxWidth: '280px' }}>
                  {firstMsg ? (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', marginRight: '6px', background: (TYPE_COLORS[firstMsg.type] || '#64748b') + '20', color: TYPE_COLORS[firstMsg.type] || '#64748b' }}>
                        {firstMsg.type}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{preview(firstMsg.text)}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#4a5568', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#00b4d8' }}>{chat._count.userRequests} ↑</span>
                    <span style={{ fontSize: '11px', color: '#8b5cf6' }}>{chat._count.agentResponses} ↓</span>
                  </div>
                </td>
                <td style={{ padding: '14px', color: '#4a5568', fontSize: '12px' }}>
                  {new Date(chat.startTime).toLocaleString()}
                </td>
                <td style={{ padding: '14px', color: '#4a5568', fontSize: '12px' }}>
                  {new Date(chat.lastUpdated).toLocaleString()}
                </td>
                <td style={{ padding: '14px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Btn variant="secondary" size="sm" onClick={() => router.push(`/admin/chats/${chat.id}`)}>
                      <ChevronRight size={13} /> View
                    </Btn>
                    <Btn
                      variant="danger" size="sm"
                      onClick={() => handleDelete(chat.id)}
                      disabled={deletingId === chat.id}
                    >
                      <Trash2 size={13} />
                    </Btn>
                  </div>
                </td>
              </tr>
            )
          })}
        </Table>
        <div style={{ padding: '16px', borderTop: '1px solid #1a2332', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Showing {chats.length} of {total}</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}