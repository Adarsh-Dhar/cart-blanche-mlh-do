'use client'

import { useEffect, useState, useCallback } from 'react'
import { Eye, Trash2, ChevronDown, Filter, RefreshCw, Package } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Select, Btn, Toast, EmptyState, SearchBar, PageHeader, Table, Pagination, Badge } from '@/components/admin/ui'
import Link from 'next/link';

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

const ALL_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || '#64748b'
  return (
    <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: c + '20', color: c, border: `1px solid ${c}40`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [walletFilter, setWalletFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '15',
        ...(filterStatus && { status: filterStatus }),
        ...(walletFilter && { userWallet: walletFilter }),
      })
      const res = await fetch(`${API}/api/orders?${params}`)
      const data = await res.json()
      setOrders(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
      setTotal(data.meta?.total || 0)
    } catch { setToast({ msg: 'Failed to load orders', type: 'error' }) }
    finally { setLoading(false) }
  }, [page, filterStatus, walletFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filterStatus, walletFilter, search])

  const handleStatusUpdate = async () => {
    if (!statusChangeId || !newStatus) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/orders/${statusChangeId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: `Order moved to ${newStatus}`, type: 'success' })
      setStatusChangeId(null)
      // Refresh selected order if open
      if (selectedOrder?.id === statusChangeId) {
        const updated = await fetch(`${API}/api/orders/${statusChangeId}`).then(r => r.json())
        setSelectedOrder(updated.data)
      }
      load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API}/api/orders/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Order deleted', type: 'success' })
      setDeleteId(null); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setDeleteId(null) }
  }

  const filteredOrders = search
    ? orders.filter(o =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.userWallet || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.txHash || '').toLowerCase().includes(search.toLowerCase())
      )
    : orders

  const openStatusChange = (order: Order) => {
    const transitions = STATUS_TRANSITIONS[order.status] || []
    if (transitions.length === 0) return setToast({ msg: `Cannot transition from ${order.status}`, type: 'error' })
    setStatusChangeId(order.id)
    setNewStatus(transitions[0])
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${total} orders total`} />

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['', ...ALL_STATUSES].map(s => {
          const active = filterStatus === s
          const color = s ? STATUS_COLORS[s] : '#00ff9d'
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: active ? 600 : 400,
              background: active ? color + '20' : 'transparent',
              border: `1px solid ${active ? color + '60' : '#1a2332'}`,
              color: active ? color : '#64748b', cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {s || 'All'}
            </button>
          )
        })}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '360px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search order ID, wallet, tx hash…" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '8px 14px', background: walletFilter ? '#f59e0b20' : 'transparent', border: `1px solid ${walletFilter ? '#f59e0b60' : '#1a2332'}`, borderRadius: '8px', color: walletFilter ? '#f59e0b' : '#64748b', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} />Advanced
          </button>
          <button onClick={load} style={{ padding: '8px 10px', background: 'transparent', border: '1px solid #1a2332', borderRadius: '8px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          <Field label="Wallet Address">
            <input value={walletFilter} onChange={e => setWalletFilter(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: '9px 12px', background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setWalletFilter('')}>Clear</Btn>
          </div>
        </div>
      )}

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <Table headers={['Order ID', 'Wallet', 'Items', 'Total', 'Status', 'Created', 'Actions']} loading={loading}>
          {filteredOrders.length === 0 && !loading ? (
            <tr><td colSpan={7}><EmptyState message="No orders found" /></td></tr>
          ) : filteredOrders.map(order => (
            <tr key={order.id}
              style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <td style={{ padding: '14px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00ff9d', background: '#00ff9d10', padding: '3px 8px', borderRadius: '4px' }}>
                  {order.id.slice(0, 12)}…
                </span>
              </td>
              <td style={{ padding: '14px' }}>
                {order.userWallet ? (
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{order.userWallet.slice(0, 10)}…</span>
                ) : <span style={{ color: '#2d3748' }}>—</span>}
              </td>
              <td style={{ padding: '14px', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={12} />{order.items?.length || 0}
                </span>
              </td>
              <td style={{ padding: '14px', color: '#e2e8f0', fontWeight: 600 }}>
                ${parseFloat(order.totalAmount).toFixed(2)}
              </td>
              <td style={{ padding: '14px' }}><StatusBadge status={order.status} /></td>
              <td style={{ padding: '14px', color: '#4a5568', fontSize: '12px' }}>
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setSelectedOrder(order)} style={{ padding: '6px', background: '#00ff9d15', border: '1px solid #00ff9d30', borderRadius: '6px', color: '#00ff9d', cursor: 'pointer' }}><Eye size={13} /></button>
                  <button onClick={() => openStatusChange(order)} disabled={STATUS_TRANSITIONS[order.status]?.length === 0} style={{ padding: '6px', background: '#3b82f620', border: '1px solid #3b82f630', borderRadius: '6px', color: '#3b82f6', cursor: STATUS_TRANSITIONS[order.status]?.length === 0 ? 'not-allowed' : 'pointer', opacity: STATUS_TRANSITIONS[order.status]?.length === 0 ? 0.4 : 1 }}><ChevronDown size={13} /></button>
                  {(order.status === 'PENDING' || order.status === 'CANCELLED') && (
                    <button onClick={() => setDeleteId(order.id)} style={{ padding: '6px', background: '#ef444420', border: '1px solid #ef444430', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  )}
                </div>
              </td>
              <td>
                <Link href={`/admin/orders/${order.id}`}>
                  <Btn variant="secondary" size="sm">View</Btn>
                </Link>
              </td>
            </tr>
          ))}
        </Table>
        <div style={{ padding: '16px', borderTop: '1px solid #1a2332', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Showing {filteredOrders.length} of {total}</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal title={`Order Details`} onClose={() => setSelectedOrder(null)} width="600px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Order ID', value: selectedOrder.id, mono: true },
              { label: 'Status', value: null, badge: selectedOrder.status },
              { label: 'Total', value: `$${parseFloat(selectedOrder.totalAmount).toFixed(2)}` },
              { label: 'Created', value: new Date(selectedOrder.createdAt).toLocaleString() },
              { label: 'Wallet', value: selectedOrder.userWallet || '—', mono: true },
              { label: 'Tx Hash', value: selectedOrder.txHash || '—', mono: true },
            ].map(({ label, value, mono, badge }) => (
              <div key={label} style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
                {badge ? <StatusBadge status={badge} /> : (
                  <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Order Items ({selectedOrder.items?.length || 0})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {(selectedOrder.items || []).map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>{item.product.name}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>via {item.vendor.name}</div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                  <div style={{ color: '#00ff9d', fontWeight: 600 }}>${parseFloat(item.price).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: '#4a5568' }}>×{item.quantity}</div>
                </div>
                <div style={{ marginLeft: '16px', fontWeight: 700, color: '#e2e8f0' }}>
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {STATUS_TRANSITIONS[selectedOrder.status]?.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1a2332', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#4a5568', alignSelf: 'center' }}>Move to:</span>
              {STATUS_TRANSITIONS[selectedOrder.status].map(s => (
                <Btn key={s} variant="secondary" size="sm" onClick={async () => {
                  setSaving(true)
                  try {
                    const res = await fetch(`${API}/api/orders/${selectedOrder.id}`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: s })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    setSelectedOrder(data.data)
                    setToast({ msg: `Status → ${s}`, type: 'success' })
                    load()
                  } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
                  finally { setSaving(false) }
                }} disabled={saving}>
                  {s}
                </Btn>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Status Change Modal */}
      {statusChangeId && (
        <Modal title="Update Order Status" onClose={() => setStatusChangeId(null)} width="380px">
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>Current status: <StatusBadge status={orders.find(o => o.id === statusChangeId)?.status || ''} /></div>
          </div>
          <Field label="New Status">
            <Select value={newStatus} onChange={setNewStatus}>
              {(STATUS_TRANSITIONS[orders.find(o => o.id === statusChangeId)?.status || ''] || []).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setStatusChangeId(null)}>Cancel</Btn>
            <Btn onClick={handleStatusUpdate} disabled={saving}>{saving ? 'Updating…' : 'Update Status'}</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Order"
          message="This will permanently delete the order and restore product stock. Only PENDING or CANCELLED orders can be deleted."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}