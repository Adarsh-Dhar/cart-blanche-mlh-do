'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Package, ShoppingCart } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Textarea, Btn, Toast, Badge, Table, Pagination } from '@/components/admin/ui'
import { vendorsApi, productsApi, ordersApi, Vendor, Product, Order, ApiError } from '@/lib/api-client'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', PAID: '#8b5cf6',
  SHIPPED: '#06b6d4', DELIVERED: '#10b981', CANCELLED: '#ef4444',
}
const AVAIL_COLORS: Record<string, string> = {
  IN_STOCK: '#10b981', OUT_OF_STOCK: '#ef4444', PRE_ORDER: '#f59e0b', DISCONTINUED: '#64748b',
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [vendor,         setVendor]         = useState<Vendor | null>(null)
  const [products,       setProducts]       = useState<Product[]>([])
  const [orders,         setOrders]         = useState<Order[]>([])
  const [loading,        setLoading]        = useState(true)
  const [productPage,    setProductPage]    = useState(1)
  const [productTotal,   setProductTotal]   = useState(0)
  const [productPages,   setProductPages]   = useState(1)
  const [orderPage,      setOrderPage]      = useState(1)
  const [orderTotal,     setOrderTotal]     = useState(0)
  const [orderPages,     setOrderPages]     = useState(1)
  const [showEdit,       setShowEdit]       = useState(false)
  const [showDelete,     setShowDelete]     = useState(false)
  const [form,           setForm]           = useState({ name: '', description: '', logoUrl: '', pubkey: '' })
  const [saving,         setSaving]         = useState(false)
  const [toast,          setToast]          = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, pRes, oRes] = await Promise.all([
        vendorsApi.get(id),
        productsApi.list({ vendorId: id, page: productPage, limit: 10 }),
        ordersApi.list({ vendorId: id, page: orderPage, limit: 10 }),
      ])
      setVendor(vRes.data)
      setProducts(pRes.data); setProductTotal(pRes.meta.total); setProductPages(pRes.meta.totalPages)
      setOrders(oRes.data);   setOrderTotal(oRes.meta.total);   setOrderPages(oRes.meta.totalPages)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) router.push('/admin/vendors')
      else setToast({ msg: 'Failed to load vendor', type: 'error' })
    } finally { setLoading(false) }
  }, [id, productPage, orderPage, router])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    if (!vendor) return
    setForm({ name: vendor.name, description: vendor.description ?? '', logoUrl: vendor.logoUrl ?? '', pubkey: vendor.pubkey })
    setShowEdit(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.pubkey.trim()) return setToast({ msg: 'Name and pubkey required', type: 'error' })
    setSaving(true)
    try {
      await vendorsApi.update(id, form)
      setToast({ msg: 'Vendor updated', type: 'success' })
      setShowEdit(false); load()
    } catch (e) { setToast({ msg: e instanceof ApiError ? e.message : 'Update failed', type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await vendorsApi.delete(id)
      router.push('/admin/vendors')
    } catch (e) { setToast({ msg: e instanceof ApiError ? e.message : 'Delete failed', type: 'error' }); setShowDelete(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>Loading…</div>
  if (!vendor) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Link href="/admin/vendors" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <ArrowLeft size={13} /> Vendors
        </Link>
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: 13, color: '#e2e8f0' }}>{vendor.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {vendor.logoUrl
            ? <img src={vendor.logoUrl} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: '1px solid #1a2332' }} />
            : (
              <div style={{ width: 72, height: 72, borderRadius: 16, background: 'linear-gradient(135deg, #00ff9d20, #00b4d820)', border: '1px solid #00ff9d30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#00ff9d' }}>
                {vendor.name[0]?.toUpperCase()}
              </div>
            )
          }
          <div>
            <div style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>◆ Vendor</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>{vendor.name}</h1>
            {vendor.description && <p style={{ color: '#4a5568', fontSize: 13, marginTop: 4 }}>{vendor.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={openEdit}><Pencil size={14} />Edit</Btn>
          <Btn variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} />Delete</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Products', value: vendor._count?.products ?? productTotal, color: '#00b4d8', icon: Package },
          { label: 'Orders',   value: vendor._count?.orders   ?? orderTotal,   color: '#8b5cf6', icon: ShoppingCart },
          { label: 'Since',    value: new Date(vendor.createdAt).toLocaleDateString(), color: '#00ff9d', icon: null },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0d1117', border: `1px solid ${color}22`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 32 }}>
        <InfoCell label="Public Key"   value={vendor.pubkey}    mono />
        <InfoCell label="Vendor ID"    value={vendor.id}        mono />
        <InfoCell label="Created"      value={new Date(vendor.createdAt).toLocaleString()} />
        <InfoCell label="Last Updated" value={new Date(vendor.updatedAt).toLocaleString()} />
      </div>

      {/* Products table */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Products <span style={{ color: '#00b4d8', marginLeft: 6 }}>{productTotal}</span>
          </div>
          <Link href={`/admin/products?vendorId=${id}`} style={{ fontSize: 12, color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: 12, overflow: 'hidden' }}>
          <Table headers={['Name', 'SKU', 'Price', 'Stock', 'Category', 'Status']} loading={false}>
            {products.length === 0
              ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No products yet</td></tr>
              : products.map(p => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #1a233240', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#e2e8f0' }}>{p.name}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#1a2332', padding: '2px 8px', borderRadius: 4 }}>{p.sku}</span></td>
                  <td style={{ padding: '12px 14px', color: '#00ff9d', fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', color: p.stockQuantity === 0 ? '#ef4444' : p.stockQuantity < 10 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{p.stockQuantity}</td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>{p.category?.name}</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={p.availability.replace('_', ' ')} color={AVAIL_COLORS[p.availability] || '#64748b'} /></td>
                </tr>
              ))
            }
          </Table>
          {productPages > 1 && <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2332' }}><Pagination page={productPage} totalPages={productPages} onPage={setProductPage} /></div>}
        </div>
      </div>

      {/* Orders table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Orders <span style={{ color: '#8b5cf6', marginLeft: 6 }}>{orderTotal}</span>
          </div>
          <Link href={`/admin/orders?vendorId=${id}`} style={{ fontSize: 12, color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: 12, overflow: 'hidden' }}>
          <Table headers={['Order ID', 'Wallet', 'Items', 'Total', 'Status', 'Date']} loading={false}>
            {orders.length === 0
              ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No orders yet</td></tr>
              : orders.map(o => (
                <tr key={o.id}
                  style={{ borderBottom: '1px solid #1a233240', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00ff9d', background: '#00ff9d10', padding: '3px 8px', borderRadius: 4 }}>{o.id.slice(0, 12)}…</span></td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{o.userWallet ? `${o.userWallet.slice(0, 10)}…` : '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{o.items?.length ?? 0}</td>
                  <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 600 }}>${parseFloat(o.totalAmount).toFixed(2)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[o.status] || '#64748b') + '20', color: STATUS_COLORS[o.status] || '#64748b', border: `1px solid ${(STATUS_COLORS[o.status] || '#64748b')}40` }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#4a5568', fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            }
          </Table>
          {orderPages > 1 && <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2332' }}><Pagination page={orderPage} totalPages={orderPages} onPage={setOrderPage} /></div>}
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Vendor" onClose={() => setShowEdit(false)}>
          <Field label="Name" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
          <Field label="Public Key" required><Input value={form.pubkey} onChange={v => setForm(f => ({ ...f, pubkey: v }))} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} /></Field>
          <Field label="Logo URL"><Input value={form.logoUrl} onChange={v => setForm(f => ({ ...f, logoUrl: v }))} /></Field>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update'}</Btn>
          </div>
        </Modal>
      )}

      {showDelete && (
        <ConfirmDialog title="Delete Vendor" message="This will permanently delete the vendor. Vendors with products cannot be deleted." onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}