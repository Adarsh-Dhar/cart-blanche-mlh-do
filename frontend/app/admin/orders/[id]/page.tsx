'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react'
import { ConfirmDialog, Btn, Toast } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface OrderItem {
  id: string; quantity: number; price: string
  product: { id: string; name: string; sku?: string; images?: string[] }
  vendor: { id: string; name: string }
}
interface Order {
  id: string; status: string; totalAmount: string; userWallet?: string
  txHash?: string; createdAt: string; updatedAt: string; items: OrderItem[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', PAID: '#8b5cf6',
  SHIPPED: '#06b6d4', DELIVERED: '#10b981', CANCELLED: '#ef4444'
}
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [], CANCELLED: []
}
const STATUS_SEQUENCE = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED']

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const c = STATUS_COLORS[status] || '#64748b'
  return (
    <span style={{ padding: large ? '6px 16px' : '3px 10px', borderRadius: '6px', fontSize: large ? '13px' : '11px', fontWeight: 600, background: c + '20', color: c, border: `1px solid ${c}40` }}>
      {status}
    </span>
  )
}

function InfoCell({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
      {children || <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</div>}
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/orders/${id}`)
      const data = await res.json()
      if (!res.ok) { router.push('/admin/orders'); return }
      setOrder(data.data)
    } catch { setToast({ msg: 'Failed to load order', type: 'error' }) }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { load() }, [load])

  const handleTransition = async (status: string) => {
    setTransitioning(true)
    try {
      const res = await fetch(`${API}/api/orders/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setOrder(data.data)
      setToast({ msg: `Status → ${status}`, type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setTransitioning(false) }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/admin/orders')
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setShowDelete(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>Loading…</div>
  if (!order) return null

  const transitions = STATUS_TRANSITIONS[order.status] || []
  const canDelete = order.status === 'PENDING' || order.status === 'CANCELLED'
  const currentStep = STATUS_SEQUENCE.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED'

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link href="/admin/orders" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ArrowLeft size={13} /> Orders
        </Link>
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>{order.id.slice(0, 16)}…</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ Order</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', margin: 0 }}>{order.id}</h1>
            <StatusBadge status={order.status} large />
          </div>
          <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '6px' }}>
            Created {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="ghost" onClick={load}><RefreshCw size={14} />Refresh</Btn>
          {canDelete && <Btn variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} />Delete</Btn>}
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Order Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto' }}>
            {STATUS_SEQUENCE.map((s, i) => {
              const done = i <= currentStep
              const current = i === currentStep
              const c = STATUS_COLORS[s] || '#64748b'
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_SEQUENCE.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: done ? c + '25' : '#1a2332',
                      border: `2px solid ${done ? c : '#2d3748'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: current ? `0 0 12px ${c}60` : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {done ? <span style={{ fontSize: '14px', color: c }}>✓</span> : <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2d3748', display: 'block' }} />}
                    </div>
                    <div style={{ fontSize: '10px', color: done ? c : '#4a5568', fontWeight: current ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</div>
                  </div>
                  {i < STATUS_SEQUENCE.length - 1 && (
                    <div style={{ flex: 1, height: '2px', background: i < currentStep ? (STATUS_COLORS[STATUS_SEQUENCE[i + 1]] || '#64748b') : '#1a2332', margin: '0 8px', marginBottom: '24px', transition: 'background 0.3s' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#ef4444', fontSize: '18px' }}>✕</span>
          <span style={{ color: '#ef4444', fontSize: '13px' }}>This order has been cancelled.</span>
        </div>
      )}

      {/* Transition actions */}
      {transitions.length > 0 && (
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Move to:</span>
          {transitions.map(s => (
            <button key={s} onClick={() => handleTransition(s)} disabled={transitioning}
              style={{ padding: '8px 16px', background: (STATUS_COLORS[s] || '#64748b') + '18', border: `1px solid ${(STATUS_COLORS[s] || '#64748b')}50`, borderRadius: '8px', color: STATUS_COLORS[s] || '#64748b', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, cursor: transitioning ? 'not-allowed' : 'pointer', opacity: transitioning ? 0.6 : 1 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <InfoCell label="Order ID" value={order.id} mono />
        <InfoCell label="Total Amount">
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#00ff9d', fontFamily: "'Syne', sans-serif" }}>
            ${parseFloat(order.totalAmount).toFixed(2)}
          </div>
        </InfoCell>
        <InfoCell label="Wallet" value={order.userWallet} mono />
        <InfoCell label="Transaction Hash" value={order.txHash} mono />
        <InfoCell label="Created" value={new Date(order.createdAt).toLocaleString()} />
        <InfoCell label="Last Updated" value={new Date(order.updatedAt).toLocaleString()} />
      </div>

      {/* Line items */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a2332', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Line Items <span style={{ color: '#00b4d8', marginLeft: '6px' }}>{order.items?.length || 0}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#4a5568' }}>
            Subtotal: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${parseFloat(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
        {(order.items || []).length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#4a5568', fontSize: '13px' }}>No items</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {order.items.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: i < order.items.length - 1 ? '1px solid #1a233240' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff04'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                  {item.product.images?.[0] && (
                    <img src={item.product.images[0]} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #1a2332', flexShrink: 0 }} />
                  )}
                  <div>
                    <Link href={`/admin/products/${item.product.id}`} style={{ fontWeight: 600, color: '#e2e8f0', textDecoration: 'none', fontSize: '14px' }}>
                      {item.product.name}
                    </Link>
                    <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '3px' }}>
                      via <Link href={`/admin/vendors/${item.vendor.id}`} style={{ color: '#00b4d8', textDecoration: 'none' }}>{item.vendor.name}</Link>
                      {item.product.sku && <span style={{ fontFamily: 'monospace', background: '#1a2332', padding: '1px 6px', borderRadius: '4px', marginLeft: '8px' }}>{item.product.sku}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginLeft: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>Unit price</div>
                    <div style={{ color: '#00ff9d', fontWeight: 600 }}>${parseFloat(item.price).toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>Qty</div>
                    <div style={{ color: '#94a3b8', fontWeight: 600 }}>×{item.quantity}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>Subtotal</div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Total row */}
            <div style={{ padding: '16px 24px', background: '#080c10', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>
                Total: <span style={{ color: '#00ff9d', marginLeft: '12px', fontSize: '20px' }}>${parseFloat(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Order"
          message="This will permanently delete the order and restore product stock. Only PENDING or CANCELLED orders can be deleted."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}