'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pencil, Trash2, Plus, Filter } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Textarea, Select, Btn, Toast, EmptyState, SearchBar, PageHeader, Table, Pagination, Badge } from '@/components/admin/ui'
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Product {
  id: string; productID: string; sku: string; name: string; description: string
  price: string; currency: string; stockQuantity: number; availability: string
  condition: string; images: string[]; gtin?: string; mpn?: string
  vendor: { id: string; name: string }; category: { id: string; name: string; slug: string }
  createdAt: string
}

const emptyForm = {
  productID: '', sku: '', gtin: '', mpn: '', name: '', description: '',
  price: '', currency: 'USD', stockQuantity: '0', availability: 'IN_STOCK',
  condition: 'NEW', vendorId: '', categoryId: '', images: ''
}

const availabilityOptions = ['IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'DISCONTINUED']
const conditionOptions = ['NEW', 'USED', 'REFURBISHED']

function AvailabilityBadge({ value }: { value: string }) {
  const map: Record<string, string> = { IN_STOCK: '#10b981', OUT_OF_STOCK: '#ef4444', PRE_ORDER: '#f59e0b', DISCONTINUED: '#64748b' }
  return <Badge label={value.replace('_', ' ')} color={map[value] || '#64748b'} />
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVendor, setFilterVendor] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAvail, setFilterAvail] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '10',
        ...(search && { search }),
        ...(filterVendor && { vendorId: filterVendor }),
        ...(filterCategory && { categoryId: filterCategory }),
        ...(filterAvail && { availability: filterAvail }),
      })
      const res = await fetch(`${API}/api/products?${params}`)
      const data = await res.json()
      setProducts(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
      setTotal(data.meta?.total || 0)
    } catch { setToast({ msg: 'Failed to load products', type: 'error' }) }
    finally { setLoading(false) }
  }, [page, search, filterVendor, filterCategory, filterAvail])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, filterVendor, filterCategory, filterAvail])

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/vendors?limit=100`).then(r => r.json()),
      fetch(`${API}/api/categories?flat=true`).then(r => r.json()),
    ]).then(([v, c]) => {
      setVendors(v.data || [])
      setCategories(c.data || [])
    })
  }, [])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (p: Product) => {
    setForm({
      productID: p.productID, sku: p.sku, gtin: p.gtin || '', mpn: p.mpn || '',
      name: p.name, description: p.description, price: p.price,
      currency: p.currency, stockQuantity: String(p.stockQuantity),
      availability: p.availability, condition: p.condition,
      vendorId: p.vendor.id, categoryId: p.category.id,
      images: p.images.join(', ')
    })
    setEditingId(p.id); setShowForm(true)
  }

  const handleSave = async () => {
    const required = ['productID', 'sku', 'name', 'description', 'price', 'vendorId', 'categoryId']
    if (required.some(k => !(form as any)[k])) return setToast({ msg: 'Fill all required fields', type: 'error' })
    setSaving(true)
    try {
      const url = editingId ? `${API}/api/products/${editingId}` : `${API}/api/products`
      const method = editingId ? 'PUT' : 'POST'
      const body = {
        ...form,
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity),
        images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
        ...(form.gtin ? { gtin: form.gtin } : {}),
        ...(form.mpn ? { mpn: form.mpn } : {}),
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: editingId ? 'Product updated' : 'Product created', type: 'success' })
      setShowForm(false); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API}/api/products/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Product deleted', type: 'success' })
      setDeleteId(null); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setDeleteId(null) }
  }

  return (
    <div>
      <PageHeader title="Products" subtitle={`${total} products total`}
        action={<Btn onClick={openCreate}><Plus size={14} />New Product</Btn>}
      />

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '360px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, SKU, product ID…" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '8px 14px', background: (filterVendor || filterCategory || filterAvail) ? '#f59e0b20' : 'transparent', border: `1px solid ${(filterVendor || filterCategory || filterAvail) ? '#f59e0b60' : '#1a2332'}`, borderRadius: '8px', color: (filterVendor || filterCategory || filterAvail) ? '#f59e0b' : '#64748b', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={13} />Filters{(filterVendor || filterCategory || filterAvail) ? ' ●' : ''}
        </button>
      </div>

      {showFilters && (
        <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vendor</div>
            <Select value={filterVendor} onChange={setFilterVendor}>
              <option value="">All vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</div>
            <Select value={filterCategory} onChange={setFilterCategory}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Availability</div>
            <Select value={filterAvail} onChange={setFilterAvail}>
              <option value="">All</option>
              {availabilityOptions.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => { setFilterVendor(''); setFilterCategory(''); setFilterAvail('') }}>Clear filters</Btn>
          </div>
        </div>
      )}

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <Table headers={['Product', 'SKU', 'Price', 'Stock', 'Vendor', 'Category', 'Status', 'Actions']} loading={loading}>
          {products.length === 0 && !loading ? (
            <tr><td colSpan={8}><EmptyState message="No products found" action={<Btn onClick={openCreate}><Plus size={14} />Create first product</Btn>} /></td></tr>
          ) : products.map(product => (
            <tr key={product.id}
              style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <td style={{ padding: '14px', maxWidth: '200px' }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>ID: {product.productID}</div>
              </td>
              <td style={{ padding: '14px' }}><span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>{product.sku}</span></td>
              <td style={{ padding: '14px', color: '#00ff9d', fontWeight: 600 }}>${parseFloat(product.price).toFixed(2)}</td>
              <td style={{ padding: '14px' }}>
                <span style={{ color: product.stockQuantity === 0 ? '#ef4444' : product.stockQuantity < 10 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                  {product.stockQuantity}
                </span>
              </td>
              <td style={{ padding: '14px', color: '#94a3b8', fontSize: '12px' }}>{product.vendor.name}</td>
              <td style={{ padding: '14px', color: '#94a3b8', fontSize: '12px' }}>{product.category.name}</td>
              <td style={{ padding: '14px' }}><AvailabilityBadge value={product.availability} /></td>
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(product)} style={{ padding: '6px', background: '#3b82f620', border: '1px solid #3b82f630', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={13} /></button>
                  <button onClick={() => setDeleteId(product.id)} style={{ padding: '6px', background: '#ef444420', border: '1px solid #ef444430', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                </div>
              </td>
              <td>
                <Link href={`/admin/products/${product.id}`}>
                  <Btn variant="secondary" size="sm">View</Btn>
                </Link>
              </td>
            </tr>
          ))}
        </Table>
        <div style={{ padding: '16px', borderTop: '1px solid #1a2332' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal title={editingId ? 'Edit Product' : 'New Product'} onClose={() => setShowForm(false)} width="640px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Product ID" required><Input value={form.productID} onChange={(v: any) => setForm(f => ({ ...f, productID: v }))} placeholder="PROD-001" /></Field>
            <Field label="SKU" required><Input value={form.sku} onChange={(v: any) => setForm(f => ({ ...f, sku: v }))} placeholder="SKU-ABC-123" /></Field>
            <Field label="GTIN"><Input value={form.gtin} onChange={(v: any) => setForm(f => ({ ...f, gtin: v }))} placeholder="Optional" /></Field>
            <Field label="MPN"><Input value={form.mpn} onChange={(v: any) => setForm(f => ({ ...f, mpn: v }))} placeholder="Optional" /></Field>
          </div>
          <Field label="Name" required><Input value={form.name} onChange={(v: any) => setForm(f => ({ ...f, name: v }))} placeholder="Product name" /></Field>
          <Field label="Description" required>
            <Textarea value={form.description} onChange={(v: any) => setForm(f => ({ ...f, description: v }))} placeholder="Detailed product description…" rows={3} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Field label="Price" required><Input type="number" step="0.01" value={form.price} onChange={(v: any) => setForm(f => ({ ...f, price: v }))} placeholder="29.99" /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(v: any) => setForm(f => ({ ...f, currency: v }))} placeholder="USD" /></Field>
            <Field label="Stock Qty"><Input type="number" value={form.stockQuantity} onChange={(v: any) => setForm(f => ({ ...f, stockQuantity: v }))} placeholder="100" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Availability">
              <Select value={form.availability} onChange={(v: any) => setForm(f => ({ ...f, availability: v }))}>
                {availabilityOptions.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onChange={(v: any) => setForm(f => ({ ...f, condition: v }))}>
                {conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Vendor" required>
              <Select value={form.vendorId} onChange={(v: any) => setForm(f => ({ ...f, vendorId: v }))}>
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Category" required>
              <Select value={form.categoryId} onChange={(v: any) => setForm(f => ({ ...f, categoryId: v }))}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Image URLs" hint="Comma-separated list of image URLs">
            <Textarea value={form.images} onChange={(v: any) => setForm(f => ({ ...f, images: v }))} placeholder="https://...jpg, https://...png" rows={2} />
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Product' : 'Create Product'}</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Product"
          message="This will permanently delete the product. Products that have been ordered cannot be deleted — consider marking them as OUT_OF_STOCK instead."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}