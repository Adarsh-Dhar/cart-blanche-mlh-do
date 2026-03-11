'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Store, Hash, ShoppingBag, ChevronRight } from 'lucide-react'
import { Btn, Toast, Badge } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface OrderItem {
  id: string
  quantity: number
  price: string
  createdAt?: string
  updatedAt?: string
  product: {
    id: string
    name: string
    sku?: string
    images?: string[]
    price?: string
    availability?: string
  }
  vendor: {
    id: string
    name: string
    logoUrl?: string
  }
  order?: {
    id: string
    status: string
    totalAmount: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', PAID: '#8b5cf6',
  SHIPPED: '#06b6d4', DELIVERED: '#10b981', CANCELLED: '#ef4444'
}

function MetaCell({ label, value, mono, color }: { label: string; value: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px', padding: '14px' }}>
      <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: color || '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}

export default function OrderItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<OrderItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${API}/api/order-items/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Not found')
        setItem(data.data || data)
      } catch (e: any) {
        setToast({ msg: e.message, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', height: '100px', animation: 'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    )
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a5568' }}>
        <Package size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
        <div style={{ fontSize: '14px' }}>Order item not found</div>
        <Link href="/admin/orders" style={{ color: '#00ff9d', fontSize: '13px', marginTop: '12px', display: 'inline-block' }}>← Back to Orders</Link>
      </div>
    )
  }

  const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2)
  const images = item.product.images || []
  const statusColor = STATUS_COLORS[item.order?.status || ''] || '#64748b'
  const orderId = item.order?.id

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', fontSize: '12px', color: '#4a5568', flexWrap: 'wrap' }}>
        <Link href="/admin" style={{ color: '#4a5568', textDecoration: 'none' }}>Admin</Link>
        <ChevronRight size={12} />
        <Link href="/admin/orders" style={{ color: '#4a5568', textDecoration: 'none' }}>Orders</Link>
        {orderId && (
          <>
            <ChevronRight size={12} />
            <Link href={`/admin/orders/${orderId}`} style={{ color: '#00b4d8', textDecoration: 'none', fontFamily: 'monospace' }}>
              {orderId.slice(0, 12)}…
            </Link>
          </>
        )}
        <ChevronRight size={12} />
        <span style={{ color: '#00ff9d', fontFamily: 'monospace' }}>Item {id.slice(0, 10)}…</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            ◆ ORDER LINE ITEM
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>
            {item.product.name}
          </h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00ff9d', background: '#00ff9d10', padding: '3px 10px', borderRadius: '4px', border: '1px solid #00ff9d30' }}>
              ×{item.quantity}
            </span>
            {item.order?.status && (
              <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}>
                {item.order.status}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {orderId && (
            <Link href={`/admin/orders/${orderId}`}>
              <Btn variant="secondary">← Back to Order</Btn>
            </Link>
          )}
          <Link href="/admin/orders">
            <Btn variant="ghost"><ArrowLeft size={14} /> Orders</Btn>
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Product Card */}
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={11} /> Product
          </div>

          {/* Image Gallery */}
          {images.length > 0 ? (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', background: '#080c10', border: '1px solid #1a2332', marginBottom: '8px', position: 'relative' }}>
                <img
                  src={images[imgIdx]}
                  alt={item.product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a2332" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%234a5568" font-size="12">No image</text></svg>' }}
                />
                {images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                    <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0} style={{ padding: '4px 8px', background: '#080c10cc', border: '1px solid #1a2332', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>‹</button>
                    <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} disabled={imgIdx === images.length - 1} style={{ padding: '4px 8px', background: '#080c10cc', border: '1px solid #1a2332', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}>›</button>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: `1px solid ${i === imgIdx ? '#00ff9d60' : '#1a2332'}`, background: '#080c10' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Package size={32} color="#1e2a3a" />
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: '15px', color: '#e2e8f0', marginBottom: '6px' }}>{item.product.name}</div>
          {item.product.sku && (
            <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: 'monospace', marginBottom: '12px' }}>SKU: {item.product.sku}</div>
          )}
          {item.product.availability && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: item.product.availability === 'IN_STOCK' ? '#10b98120' : '#ef444420', color: item.product.availability === 'IN_STOCK' ? '#10b981' : '#ef4444', border: `1px solid ${item.product.availability === 'IN_STOCK' ? '#10b98140' : '#ef444440'}` }}>
                {item.product.availability.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <Link href={`/admin/products/${item.product.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#00b4d8', textDecoration: 'none', padding: '7px 12px', background: '#00b4d810', border: '1px solid #00b4d820', borderRadius: '7px', transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#00b4d820'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#00b4d810'}
          >
            <Package size={12} /> View Product →
          </Link>
        </div>

        {/* Pricing + Vendor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Pricing Summary */}
          <div style={{ background: '#0d1117', border: '1px solid #00ff9d22', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle at top right, #00ff9d15, transparent 70%)' }} />
            <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
              Pricing
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Unit Price', value: `$${parseFloat(item.price).toFixed(2)}`, color: '#00ff9d', size: '20px' },
                { label: 'Quantity', value: `×${item.quantity}`, color: '#94a3b8', size: '18px' },
              ].map(({ label, value, color, size }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#080c10', borderRadius: '8px', border: '1px solid #1a2332' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: size, fontWeight: 700, color, fontFamily: "'Syne', sans-serif" }}>{value}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: '#1a2332', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#00ff9d08', borderRadius: '8px', border: '1px solid #00ff9d30' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Subtotal</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#00ff9d', fontFamily: "'Syne', sans-serif" }}>${subtotal}</span>
              </div>
            </div>
          </div>

          {/* Vendor Card */}
          <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={11} /> Vendor
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {item.vendor.logoUrl ? (
                <img src={item.vendor.logoUrl} alt={item.vendor.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #1a2332' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', background: '#1a2332', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#4a5568' }}>
                  {item.vendor.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '14px' }}>{item.vendor.name}</div>
                <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: 'monospace', marginTop: '2px' }}>{item.vendor.id.slice(0, 16)}…</div>
              </div>
            </div>
            <Link href={`/admin/vendors/${item.vendor.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#00ff9d', textDecoration: 'none', padding: '7px 12px', background: '#00ff9d10', border: '1px solid #00ff9d20', borderRadius: '7px', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#00ff9d20'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#00ff9d10'}
            >
              <Store size={12} /> View Vendor →
            </Link>
          </div>

          {/* Parent Order */}
          {item.order && (
            <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={11} /> Parent Order
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#4a5568' }}>Order ID</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00ff9d' }}>{item.order.id.slice(0, 16)}…</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#4a5568' }}>Status</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}>
                    {item.order.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#4a5568' }}>Order Total</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>${parseFloat(item.order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
              <Link href={`/admin/orders/${item.order.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8b5cf6', textDecoration: 'none', padding: '7px 12px', background: '#8b5cf610', border: '1px solid #8b5cf620', borderRadius: '7px', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#8b5cf620'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#8b5cf610'}
              >
                <ShoppingBag size={12} /> View Full Order →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
        <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Hash size={11} /> Metadata
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          <MetaCell label="Item ID" value={id} mono />
          <MetaCell label="Unit Price" value={`$${parseFloat(item.price).toFixed(2)}`} color="#00ff9d" />
          <MetaCell label="Quantity" value={item.quantity} />
          <MetaCell label="Subtotal" value={`$${subtotal}`} color="#00ff9d" />
          <MetaCell label="Product ID" value={item.product.id} mono />
          <MetaCell label="Vendor ID" value={item.vendor.id} mono />
          {item.order && <MetaCell label="Order ID" value={item.order.id} mono />}
          {item.createdAt && <MetaCell label="Created" value={new Date(item.createdAt).toLocaleString()} />}
          {item.updatedAt && <MetaCell label="Updated" value={new Date(item.updatedAt).toLocaleString()} />}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
      `}</style>
    </div>
  )
}