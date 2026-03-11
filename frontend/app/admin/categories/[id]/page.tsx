'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Select, Btn, Toast, Badge, Table, Pagination } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Category {
  id: string; name: string; slug: string; parentId?: string
  parent?: { id: string; name: string }
  children?: Category[]
  _count?: { products: number }
}
interface Product {
  id: string; name: string; sku: string; price: string; stockQuantity: number
  availability: string; vendor: { name: string }; createdAt: string
}

const AVAIL_COLORS: Record<string, string> = {
  IN_STOCK: '#10b981', OUT_OF_STOCK: '#ef4444', PRE_ORDER: '#f59e0b', DISCONTINUED: '#64748b'
}

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [category, setCategory] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productPage, setProductPage] = useState(1)
  const [productTotal, setProductTotal] = useState(0)
  const [productTotalPages, setProductTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', parentId: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, allRes, pRes] = await Promise.all([
        fetch(`${API}/api/categories/${id}`),
        fetch(`${API}/api/categories?flat=true`),
        fetch(`${API}/api/products?categoryId=${id}&page=${productPage}&limit=10`),
      ])
      const [cData, allData, pData] = await Promise.all([cRes.json(), allRes.json(), pRes.json()])
      if (!cRes.ok) { router.push('/admin/categories'); return }
      setCategory(cData.data)
      setAllCategories((allData.data || []).filter((c: Category) => c.id !== id))
      setProducts(pData.data || [])
      setProductTotal(pData.meta?.total || 0)
      setProductTotalPages(pData.meta?.totalPages || 1)
    } catch { setToast({ msg: 'Failed to load category', type: 'error' }) }
    finally { setLoading(false) }
  }, [id, productPage, router])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    if (!category) return
    setForm({ name: category.name, slug: category.slug, parentId: category.parentId || '' })
    setShowEdit(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) return setToast({ msg: 'Name and slug required', type: 'error' })
    setSaving(true)
    try {
      const body: any = { name: form.name, slug: form.slug }
      if (form.parentId) body.parentId = form.parentId
      const res = await fetch(`${API}/api/categories/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Category updated', type: 'success' })
      setShowEdit(false); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/admin/categories')
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setShowDelete(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>Loading…</div>
  if (!category) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/admin/categories" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ArrowLeft size={13} /> Categories
        </Link>
        {category.parent && (
          <>
            <span style={{ color: '#1a2332' }}>/</span>
            <Link href={`/admin/categories/${category.parent.id}`} style={{ color: '#4a5568', textDecoration: 'none', fontSize: '13px' }}>
              {category.parent.name}
            </Link>
          </>
        )}
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{category.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ Category</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>{category.name}</h1>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4a5568', background: '#1a2332', padding: '3px 10px', borderRadius: '6px' }}>{category.slug}</span>
            {category.parent && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                in <Link href={`/admin/categories/${category.parent.id}`} style={{ color: '#f59e0b', textDecoration: 'none' }}>{category.parent.name}</Link>
              </span>
            )}
            {!category.parent && <Badge label="Top-level" color="#00ff9d" />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="ghost" onClick={openEdit}><Pencil size={14} />Edit</Btn>
          <Btn variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} />Delete</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Products', value: productTotal, color: '#00b4d8' },
          { label: 'Subcategories', value: category.children?.length ?? 0, color: '#f59e0b' },
          { label: 'Category ID', value: category.id.slice(0, 8) + '…', color: '#64748b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0d1117', border: `1px solid ${color}22`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Subcategories */}
      {category.children && category.children.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Subcategories</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {category.children.map(child => (
              <Link key={child.id} href={`/admin/categories/${child.id}`}
                style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = '#f59e0b40'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = '#1a2332'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>{child.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>{child.slug}</div>
                </div>
                <ChevronRight size={14} color="#4a5568" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products in this category */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Products <span style={{ color: '#00b4d8', marginLeft: '6px' }}>{productTotal}</span>
          </div>
          <Link href={`/admin/products?categoryId=${id}`} style={{ fontSize: '12px', color: '#00ff9d', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
          <Table headers={['Name', 'SKU', 'Price', 'Stock', 'Vendor', 'Availability']} loading={false}>
            {products.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#4a5568', fontSize: '13px' }}>No products in this category</td></tr>
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
                <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{p.vendor?.name}</td>
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

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Category" onClose={() => setShowEdit(false)}>
          <Field label="Name" required>
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: slugify(v) }))} placeholder="Electronics" />
          </Field>
          <Field label="Slug" required hint="URL-friendly identifier">
            <Input value={form.slug} onChange={v => setForm(f => ({ ...f, slug: slugify(v) }))} placeholder="electronics" />
          </Field>
          <Field label="Parent Category" hint="Leave empty for top-level">
            <Select value={form.parentId} onChange={v => setForm(f => ({ ...f, parentId: v }))}>
              <option value="">— None (top-level) —</option>
              {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update'}</Btn>
          </div>
        </Modal>
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Category"
          message="This will permanently delete the category. Categories with products or subcategories cannot be deleted."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}