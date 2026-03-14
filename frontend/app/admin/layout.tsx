'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Store, Package, Tag, ShoppingCart, LayoutDashboard, MessageSquare
} from 'lucide-react'

const NAV = [
  { href: '/admin',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/vendors',   label: 'Vendors',    icon: Store },
  { href: '/admin/products',  label: 'Products',   icon: Package },
  { href: '/admin/categories',label: 'Categories', icon: Tag },
  { href: '/admin/orders',    label: 'Orders',     icon: ShoppingCart },
  { href: '/admin/chats',     label: 'Chats',      icon: MessageSquare },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080c10' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: '#0d1117', borderRight: '1px solid #1a2332',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1a2332' }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00ff9d', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ◆ Admin
            </div>
            <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>Cart Blanche</div>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                  background: active ? '#00ff9d15' : 'transparent',
                  border: `1px solid ${active ? '#00ff9d30' : 'transparent'}`,
                  color: active ? '#00ff9d' : '#64748b',
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  <Icon size={15} />
                  {label}
                </div>
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #1a2332' }}>
          <Link href="/" style={{ fontSize: '11px', color: '#4a5568', textDecoration: 'none' }}>
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', minHeight: '100vh' }}>
        {children}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
      `}</style>
    </div>
  )
}