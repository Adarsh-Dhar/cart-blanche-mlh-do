'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store, Package, Tag, ShoppingCart, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Stats {
  vendors: number
  products: number
  categories: number
  orders: { total: number; pending: number; processing: number; delivered: number }
}

function StatCard({ title, value, icon: Icon, color, href, sub }: {
  title: string; value: string | number; icon: any; color: string; href: string; sub?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0d1117', border: `1px solid ${color}22`,
        borderRadius: '12px', padding: '24px', cursor: 'pointer',
        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color + '66'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = color + '22'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${color}15, transparent 70%)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', background: color + '15', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
            <Icon size={18} color={color} />
          </div>
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", marginBottom: '4px' }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</div>
        {sub && <div style={{ fontSize: '11px', color: color, marginTop: '6px' }}>{sub}</div>}
      </div>
    </Link>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: '#f59e0b', PROCESSING: '#3b82f6', PAID: '#8b5cf6',
    SHIPPED: '#06b6d4', DELIVERED: '#10b981', CANCELLED: '#ef4444'
  }
  const c = colors[status] || '#64748b'
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: c + '20', color: c, border: `1px solid ${c}40` }}>
      {status}
    </span>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ vendors: 0, products: 0, categories: 0, orders: { total: 0, pending: 0, processing: 0, delivered: 0 } })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [vRes, pRes, cRes, oRes] = await Promise.all([
          fetch(`${API}/api/vendors?limit=1`),
          fetch(`${API}/api/products?limit=1`),
          fetch(`${API}/api/categories?flat=true`),
          fetch(`${API}/api/orders?limit=5`),
        ])
        const [vData, pData, cData, oData] = await Promise.all([vRes.json(), pRes.json(), cRes.json(), oRes.json()])

        const [pendRes, procRes, delRes] = await Promise.all([
          fetch(`${API}/api/orders?limit=1&status=PENDING`),
          fetch(`${API}/api/orders?limit=1&status=PROCESSING`),
          fetch(`${API}/api/orders?limit=1&status=DELIVERED`),
        ])
        const [pendData, procData, delData] = await Promise.all([pendRes.json(), procRes.json(), delRes.json()])

        setStats({
          vendors: vData.meta?.total || 0,
          products: pData.meta?.total || 0,
          categories: cData.data?.length || 0,
          orders: {
            total: oData.meta?.total || 0,
            pending: pendData.meta?.total || 0,
            processing: procData.meta?.total || 0,
            delivered: delData.meta?.total || 0,
          }
        })
        setRecentOrders(oData.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
          ◆ SYSTEM OVERVIEW
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>
          Command Center
        </h1>
        <p style={{ color: '#4a5568', fontSize: '14px', marginTop: '6px' }}>
          Real-time metrics across all API resources
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px', height: '120px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard title="Total Vendors" value={stats.vendors} icon={Store} color="#00ff9d" href="/admin/vendors" sub="↗ Active merchants" />
          <StatCard title="Products" value={stats.products} icon={Package} color="#00b4d8" href="/admin/products" sub="All SKUs" />
          <StatCard title="Categories" value={stats.categories} icon={Tag} color="#f59e0b" href="/admin/categories" sub="Taxonomy nodes" />
          <StatCard title="Total Orders" value={stats.orders.total} icon={ShoppingCart} color="#8b5cf6" href="/admin/orders" sub={`${stats.orders.pending} pending`} />
        </div>
      )}

      {/* Order pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Order Pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Pending', value: stats.orders.pending, color: '#f59e0b', icon: Clock },
              { label: 'Processing', value: stats.orders.processing, color: '#3b82f6', icon: TrendingUp },
              { label: 'Delivered', value: stats.orders.delivered, color: '#10b981', icon: CheckCircle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: '#94a3b8', flex: 1 }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{value}</div>
                <div style={{ width: '80px', height: '4px', background: '#1a2332', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, width: stats.orders.total ? `${(value / stats.orders.total) * 100}%` : '0%', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: '+ New Vendor', href: '/admin/vendors', color: '#00ff9d' },
              { label: '+ New Product', href: '/admin/products', color: '#00b4d8' },
              { label: '+ New Category', href: '/admin/categories', color: '#f59e0b' },
              { label: 'View All Orders', href: '/admin/orders', color: '#8b5cf6' },
            ].map(({ label, href, color }) => (
              <Link key={href} href={href} style={{ padding: '10px 14px', background: color + '0a', border: `1px solid ${color}20`, borderRadius: '8px', color, fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = color + '15'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = color + '0a'}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Orders</div>
          <Link href="/admin/orders" style={{ fontSize: '12px', color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#4a5568', fontSize: '13px' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
            No orders found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Order ID', 'Wallet', 'Items', 'Total', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4a5568', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1a2332' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}
                    style={{ borderBottom: '1px solid #1a233280', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff08'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', color: '#00ff9d', fontFamily: 'monospace', fontSize: '11px' }}>{order.id?.slice(0, 12)}…</td>
                    <td style={{ padding: '12px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>{order.userWallet ? order.userWallet.slice(0, 10) + '…' : '—'}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{order.items?.length || 0}</td>
                    <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: 600 }}>${parseFloat(order.totalAmount || '0').toFixed(2)}</td>
                    <td style={{ padding: '12px' }}><OrderStatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
      `}</style>
    </div>
  )
}