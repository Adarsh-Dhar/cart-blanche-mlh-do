'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Package, ShoppingCart, ExternalLink } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Textarea, Btn, Toast, Badge, Table, Pagination } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Vendor {
  id: string; name: string; description?: string; logoUrl?: string; pubkey: string
  createdAt: string; updatedAt: string; _count?: { products: number; orders: number }
}
interface Product {
  id: string; name: string; sku: string; price: string; stockQuantity: number
  availability: string; category: { name: string }; createdAt: string
}
interface Order {
  id: string; status: string; totalAmount: string; userWallet?: string
  createdAt: string; items: { quantity: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', PAID: '#8b5cf6',
  SHIPPED: '#06b6d4', DELIVERED: '#10b981', CANCELLED: '#ef4444'
}
const AVAIL_COLORS: Record<string, string> = {
  IN_STOCK: '#10b981', OUT_OF_STOCK: '#ef4444', PRE_ORDER: '#f59e0b', DISCONTINUED: '#64748b'
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [productPage, setProductPage] = useState(1)
  const [productTotal, setProductTotal] = useState(0)
  const [productTotalPages, setProductTotalPages] = useState(1)
  const [orderPage, setOrderPage] = useState(1)
  const [orderTotal, setOrderTotal] = useState(0)
  const [orderTotalPages, setOrderTotalPages] = useState(1)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '', pubkey: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, pRes, oRes] = await Promise.all([
        fetch(`${API}/api/vendors/${id}`),
        fetch(`${API}/api/products?vendorId=${id}&page=${productPage}&limit=10`),
        fetch(`${API}/api/orders?vendorId=${id}&page=${orderPage}&limit=10`),
      ])
      const [vData, pData, oData] = await Promise.all([vRes.json(), pRes.json(), oRes.json()])
      if (!vRes.ok) { router.push('/admin/vendors'); return }
      setVendor(vData.data)
      setProducts(pData.data || [])
      setProductTotal(pData.meta?.total || 0)
      setProductTotalPages(pData.meta?.totalPages || 1)
      setOrders(oData.data || [])
      setOrderTotal(oData.meta?.total || 0)
      setOrderTotalPages(oData.meta?.totalPages || 1)
    } catch { setToast({ msg: 'Failed to load vendor', type: 'error' }) }
    finally { setLoading(false) }
  }, [id, productPage, orderPage, router])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    if (!vendor) return
    setForm({ name: vendor.name, description: vendor.description || '', logoUrl: vendor.logoUrl || '', pubkey: vendor.pubkey })
    setShowEdit(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.pubkey) return setToast({ msg: 'Name and pubkey required', type: 'error' })
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/vendors/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Vendor updated', type: 'success' })
      setShowEdit(false); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/vendors/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/admin/vendors')
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setShowDelete(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>
      Loading…
    </div>
  )

  if (!vendor) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link href="/admin/vendors" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ArrowLeft size={13} /> Vendors
        </Link>
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{vendor.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {vendor.logoUrl ? (
            <img src={vendor.logoUrl} alt="" style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'cover', border: '1px solid #1a2332' }} />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: 'linear-gradient(135deg, #00ff9d20, #00b4d820)', border: '1px solid #00ff9d30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#00ff9d', fontFamily: "'Syne', sans-serif" }}>
              {vendor.name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ Vendor</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>{vendor.name}</h1>
            {vendor.description && <p style={{ color: '#4a5568', fontSize: '13px', marginTop: '4px' }}>{vendor.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="ghost" onClick={openEdit}><Pencil size={14} />Edit</Btn>
          <Btn variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} />Delete</Btn>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Products', value: vendor._count?.products ?? productTotal, color: '#00b4d8', icon: Package },
          { label: 'Orders', value: vendor._count?.orders ?? orderTotal, color: '#8b5cf6', icon: ShoppingCart },
          { label: 'Member since', value: new Date(vendor.createdAt).toLocaleDateString(), color: '#00ff9d', icon: null },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0d1117', border: `1px solid ${color}22`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Metadata grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <InfoCell label="Public Key" value={vendor.pubkey} mono />
        <InfoCell label="Vendor ID" value={vendor.id} mono />
        <InfoCell label="Created" value={new Date(vendor.createdAt).toLocaleString()} />
        <InfoCell label="Last Updated" value={new Date(vendor.updatedAt).toLocaleString()} />
      </div>

      {/* Products */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Products <span style={{ color: '#00b4d8', marginLeft: '6px' }}>{productTotal}</span>
          </div>
          <Link href={`/admin/products?vendorId=${id}`} style={{ fontSize: '12px', color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
          <Table headers={['Name', 'SKU', 'Price', 'Stock', 'Category', 'Availability']} loading={false}>
            {products.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#4a5568', fontSize: '13px' }}>No products yet</td></tr>
            ) : products.map(p => (
              <tr key={p.id}
                style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s', cursor: 'pointer' }}
                onClick={() => router.push(`/admin/products/${p.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#e2e8f0' }}>{p.name}</td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>{p.sku}</span></td>
                <td style={{ padding: '12px 14px', color: '#00ff9d', fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                <td style={{ padding: '12px 14px', color: p.stockQuantity === 0 ? '#ef4444' : p.stockQuantity < 10 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{p.stockQuantity}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{p.category?.name}</td>
                <td style={{ padding: '12px 14px' }}><Badge label={p.availability.replace('_', ' ')} color={AVAIL_COLORS[p.availability] || '#64748b'} /></td>
              </tr>
            ))}
          </Table>
          {productTotalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2332' }}>
              <Pagination page={productPage} totalPages={productTotalPages} onPage={setProductPage} />
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Orders <span style={{ color: '#8b5cf6', marginLeft: '6px' }}>{orderTotal}</span>
          </div>
          <Link href={`/admin/orders?vendorId=${id}`} style={{ fontSize: '12px', color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
          <Table headers={['Order ID', 'Wallet', 'Items', 'Total', 'Status', 'Date']} loading={false}>
            {orders.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#4a5568', fontSize: '13px' }}>No orders yet</td></tr>
            ) : orders.map(o => (
              <tr key={o.id}
                style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s', cursor: 'pointer' }}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00ff9d', background: '#00ff9d10', padding: '3px 8px', borderRadius: '4px' }}>{o.id.slice(0, 12)}…</span></td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{o.userWallet ? o.userWallet.slice(0, 10) + '…' : '—'}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{o.items?.length || 0}</td>
                <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 600 }}>${parseFloat(o.totalAmount).toFixed(2)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: (STATUS_COLORS[o.status] || '#64748b') + '20', color: STATUS_COLORS[o.status] || '#64748b', border: `1px solid ${(STATUS_COLORS[o.status] || '#64748b')}40` }}>{o.status}</span>
                </td>
                <td style={{ padding: '12px 14px', color: '#4a5568', fontSize: '12px' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </Table>
          {orderTotalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2332' }}>
              <Pagination page={orderPage} totalPages={orderTotalPages} onPage={setOrderPage} />
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Vendor" onClose={() => setShowEdit(false)}>
          <Field label="Name" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Acme Corp" /></Field>
          <Field label="Public Key" required><Input value={form.pubkey} onChange={v => setForm(f => ({ ...f, pubkey: v }))} placeholder="0x..." /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief description…" /></Field>
          <Field label="Logo URL"><Input value={form.logoUrl} onChange={v => setForm(f => ({ ...f, logoUrl: v }))} placeholder="https://…" /></Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update Vendor'}</Btn>
          </div>
        </Modal>
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Vendor"
          message="This will permanently delete the vendor. Vendors with products cannot be deleted."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}