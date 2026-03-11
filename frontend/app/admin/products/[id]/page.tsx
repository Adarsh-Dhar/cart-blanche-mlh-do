'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Textarea, Select, Btn, Toast, Badge } from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Product {
  id: string; productID: string; sku: string; gtin?: string; mpn?: string
  name: string; description: string; price: string; currency: string
  stockQuantity: number; availability: string; condition: string; images: string[]
  vendor: { id: string; name: string }
  category: { id: string; name: string; slug: string }
  createdAt: string; updatedAt: string
}

const AVAIL_COLORS: Record<string, string> = {
  IN_STOCK: '#10b981', OUT_OF_STOCK: '#ef4444', PRE_ORDER: '#f59e0b', DISCONTINUED: '#64748b'
}
const COND_COLORS: Record<string, string> = { NEW: '#00ff9d', USED: '#f59e0b', REFURBISHED: '#06b6d4' }
const availabilityOptions = ['IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'DISCONTINUED']
const conditionOptions = ['NEW', 'USED', 'REFURBISHED']

function InfoCell({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ background: '#080c10', border: '1px solid #1a2332', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
      {children || <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [imgIndex, setImgIndex] = useState(0)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({
    productID: '', sku: '', gtin: '', mpn: '', name: '', description: '',
    price: '', currency: 'USD', stockQuantity: '0', availability: 'IN_STOCK',
    condition: 'NEW', vendorId: '', categoryId: '', images: ''
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/products/${id}`)
      const data = await res.json()
      if (!res.ok) { router.push('/admin/products'); return }
      setProduct(data.data)
    } catch { setToast({ msg: 'Failed to load product', type: 'error' }) }
    finally { setLoading(false) }
  }, [id, router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/vendors?limit=100`).then(r => r.json()),
      fetch(`${API}/api/categories?flat=true`).then(r => r.json()),
    ]).then(([v, c]) => { setVendors(v.data || []); setCategories(c.data || []) })
  }, [])

  const openEdit = () => {
    if (!product) return
    setForm({
      productID: product.productID, sku: product.sku, gtin: product.gtin || '',
      mpn: product.mpn || '', name: product.name, description: product.description,
      price: product.price, currency: product.currency,
      stockQuantity: String(product.stockQuantity), availability: product.availability,
      condition: product.condition, vendorId: product.vendor.id, categoryId: product.category.id,
      images: product.images.join(', ')
    })
    setShowEdit(true)
  }

  const handleSave = async () => {
    const required = ['productID', 'sku', 'name', 'description', 'price', 'vendorId', 'categoryId']
    if (required.some(k => !(form as any)[k])) return setToast({ msg: 'Fill all required fields', type: 'error' })
    setSaving(true)
    try {
      const body: any = {
        ...form,
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity),
        images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      if (!form.gtin) delete body.gtin
      if (!form.mpn) delete body.mpn
      const res = await fetch(`${API}/api/products/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Product updated', type: 'success' })
      setShowEdit(false); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.push('/admin/products')
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setShowDelete(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#4a5568' }}>Loading…</div>
  if (!product) return null

  const images = product.images || []

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link href="/admin/products" style={{ color: '#4a5568', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ArrowLeft size={13} /> Products
        </Link>
        <span style={{ color: '#1a2332' }}>/</span>
        <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{product.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ Product</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>{product.name}</h1>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge label={product.availability.replace('_', ' ')} color={AVAIL_COLORS[product.availability] || '#64748b'} />
            <Badge label={product.condition} color={COND_COLORS[product.condition] || '#64748b'} />
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>{product.sku}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant="ghost" onClick={openEdit}><Pencil size={14} />Edit</Btn>
          <Btn variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={14} />Delete</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: images.length > 0 ? '340px 1fr' : '1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Image gallery */}
        {images.length > 0 && (
          <div>
            <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', position: 'relative' }}>
              <img src={images[imgIndex]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: '#080c10cc', border: '1px solid #1a2332', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setImgIndex(i => (i + 1) % images.length)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#080c10cc', border: '1px solid #1a2332', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setImgIndex(i)}
                    style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${i === imgIndex ? '#00ff9d' : '#1a2332'}`, cursor: 'pointer', flexShrink: 0 }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pricing / key info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#0d1117', border: '1px solid #00ff9d22', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Price</div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#00ff9d', fontFamily: "'Syne', sans-serif" }}>
              {product.currency} {parseFloat(product.price).toFixed(2)}
            </div>
          </div>
          <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Stock</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: product.stockQuantity === 0 ? '#ef4444' : product.stockQuantity < 10 ? '#f59e0b' : '#10b981', fontFamily: "'Syne', sans-serif" }}>
              {product.stockQuantity} units
            </div>
          </div>
          <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Vendor</div>
            <Link href={`/admin/vendors/${product.vendor.id}`} style={{ color: '#00b4d8', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              {product.vendor.name} →
            </Link>
          </div>
          <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '10px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Category</div>
            <Link href={`/admin/categories/${product.category.id}`} style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              {product.category.name} →
            </Link>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Description</div>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7 }}>{product.description}</p>
      </div>

      {/* Identifiers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <InfoCell label="Product ID" value={product.productID} mono />
        <InfoCell label="SKU" value={product.sku} mono />
        {product.gtin && <InfoCell label="GTIN" value={product.gtin} mono />}
        {product.mpn && <InfoCell label="MPN" value={product.mpn} mono />}
        <InfoCell label="Internal ID" value={product.id} mono />
        <InfoCell label="Created" value={new Date(product.createdAt).toLocaleString()} />
        <InfoCell label="Last Updated" value={new Date(product.updatedAt).toLocaleString()} />
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Product" onClose={() => setShowEdit(false)} width="640px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Product ID" required><Input value={form.productID} onChange={v => setForm(f => ({ ...f, productID: v }))} /></Field>
            <Field label="SKU" required><Input value={form.sku} onChange={v => setForm(f => ({ ...f, sku: v }))} /></Field>
            <Field label="GTIN"><Input value={form.gtin} onChange={v => setForm(f => ({ ...f, gtin: v }))} placeholder="Optional" /></Field>
            <Field label="MPN"><Input value={form.mpn} onChange={v => setForm(f => ({ ...f, mpn: v }))} placeholder="Optional" /></Field>
          </div>
          <Field label="Name" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} /></Field>
          <Field label="Description" required><Textarea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={3} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Field label="Price" required><Input type="number" step="0.01" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} /></Field>
            <Field label="Stock Qty"><Input type="number" value={form.stockQuantity} onChange={v => setForm(f => ({ ...f, stockQuantity: v }))} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Availability">
              <Select value={form.availability} onChange={v => setForm(f => ({ ...f, availability: v }))}>
                {availabilityOptions.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onChange={v => setForm(f => ({ ...f, condition: v }))}>
                {conditionOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Vendor" required>
              <Select value={form.vendorId} onChange={v => setForm(f => ({ ...f, vendorId: v }))}>
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Category" required>
              <Select value={form.categoryId} onChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Image URLs" hint="Comma-separated">
            <Textarea value={form.images} onChange={v => setForm(f => ({ ...f, images: v }))} rows={2} />
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update Product'}</Btn>
          </div>
        </Modal>
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Product"
          message="This will permanently delete the product. Products that have been ordered cannot be deleted — consider marking as OUT_OF_STOCK instead."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}