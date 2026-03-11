'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pencil, Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Modal, ConfirmDialog, Field, Input, Select, Btn, Toast, EmptyState, SearchBar, PageHeader, Badge } from '@/components/admin/ui'
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Category {
  id: string; name: string; slug: string; parentId?: string;
  parent?: { id: string; name: string }
  children?: Category[]
  _count?: { products: number }
}

const emptyForm = { name: '', slug: '', parentId: '' }

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function CategoryRow({ cat, depth, onEdit, onDelete, allCats }: {
  cat: Category; depth: number; onEdit: (c: Category) => void; onDelete: (id: string) => void; allCats: Category[]
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = cat.children && cat.children.length > 0

  return (
    <>
      <tr
        style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <td style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: depth > 0 ? '#1a2332' : '#2d3748' }} />
              </div>
            )}
            <span style={{ fontWeight: depth === 0 ? 600 : 400, color: depth === 0 ? '#e2e8f0' : '#94a3b8' }}>{cat.name}</span>
            {depth > 0 && <Badge label="sub" color="#64748b" />}
          </div>
        </td>
        <td style={{ padding: '12px 14px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4a5568', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>{cat.slug}</span>
        </td>
        <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{cat._count?.products ?? 0}</td>
        <td style={{ padding: '12px 14px', color: '#4a5568', fontSize: '12px' }}>{cat.parent?.name || '—'}</td>
        <td style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onEdit(cat)} style={{ padding: '6px', background: '#3b82f620', border: '1px solid #3b82f630', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={13} /></button>
            <button onClick={() => onDelete(cat.id)} style={{ padding: '6px', background: '#ef444420', border: '1px solid #ef444430', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
            <Link href={`/admin/categories/${cat.id}`}>
              <Btn variant="secondary" size="sm">View</Btn>
            </Link>
          </div>
        </td>
      </tr>
      {expanded && hasChildren && cat.children!.map(child => (
        <CategoryRow key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} allCats={allCats} />
      ))}
    </>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [flatCategories, setFlatCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [treeRes, flatRes] = await Promise.all([
        fetch(`${API}/api/categories`),
        fetch(`${API}/api/categories?flat=true`),
      ])
      const [treeData, flatData] = await Promise.all([treeRes.json(), flatRes.json()])
      setCategories(treeData.data || [])
      setFlatCategories(flatData.data || [])
    } catch { setToast({ msg: 'Failed to load categories', type: 'error' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = viewMode === 'flat'
    ? flatCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()))
    : categories

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, parentId: c.parentId || '' })
    setEditingId(c.id); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) return setToast({ msg: 'Name and slug are required', type: 'error' })
    setSaving(true)
    try {
      const url = editingId ? `${API}/api/categories/${editingId}` : `${API}/api/categories`
      const method = editingId ? 'PUT' : 'POST'
      const body: any = { name: form.name, slug: form.slug }
      if (form.parentId) body.parentId = form.parentId
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: editingId ? 'Category updated' : 'Category created', type: 'success' })
      setShowForm(false); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API}/api/categories/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setToast({ msg: 'Category deleted', type: 'success' })
      setDeleteId(null); load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }); setDeleteId(null) }
  }

  const totalCount = flatCategories.length

  return (
    <div>
      <PageHeader title="Categories" subtitle={`${totalCount} categories in taxonomy`}
        action={<Btn onClick={openCreate}><Plus size={14} />New Category</Btn>}
      />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: '360px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['tree', 'flat'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: '8px 14px', background: viewMode === mode ? '#00ff9d20' : 'transparent', border: `1px solid ${viewMode === mode ? '#00ff9d60' : '#1a2332'}`, borderRadius: '8px', color: viewMode === mode ? '#00ff9d' : '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: viewMode === mode ? 600 : 400 }}>
              {mode === 'tree' ? '⊢ Tree' : '≡ Flat'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {['Name', 'Slug', 'Products', 'Parent', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#4a5568', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1a2332' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[0,1,2,3,4].map(j => (
                    <td key={j} style={{ padding: '14px', borderBottom: '1px solid #1a233240' }}>
                      <div style={{ height: '14px', background: '#1a2332', borderRadius: '4px', width: j === 0 ? '60%' : '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}><EmptyState message="No categories found" action={<Btn onClick={openCreate}><Plus size={14} />Create first category</Btn>} /></td></tr>
            ) : viewMode === 'tree' ? (
              filtered.map(cat => (
                <CategoryRow key={cat.id} cat={cat} depth={0} onEdit={openEdit} onDelete={setDeleteId} allCats={flatCategories} />
              ))
            ) : (
              filtered.map(cat => (
                <tr key={cat.id}
                  style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 500, color: '#e2e8f0' }}>{cat.name}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4a5568', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>{cat.slug}</span></td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{cat._count?.products ?? 0}</td>
                  <td style={{ padding: '12px 14px', color: '#4a5568' }}>{cat.parent?.name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(cat)} style={{ padding: '6px', background: '#3b82f620', border: '1px solid #3b82f630', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(cat.id)} style={{ padding: '6px', background: '#ef444420', border: '1px solid #ef444430', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Edit Category' : 'New Category'} onClose={() => setShowForm(false)}>
          <Field label="Name" required>
            <Input value={form.name} onChange={(v: string) => {
              setForm(f => ({ ...f, name: v, slug: editingId ? f.slug : slugify(v) }))
            }} placeholder="Electronics" />
          </Field>
          <Field label="Slug" required hint="URL-friendly identifier">
            <Input value={form.slug} onChange={(v: string) => setForm(f => ({ ...f, slug: slugify(v) }))} placeholder="electronics" />
          </Field>
          <Field label="Parent Category" hint="Leave empty for top-level">
            <Select value={form.parentId} onChange={(v: any) => setForm(f => ({ ...f, parentId: v }))}>
              <option value="">— None (top-level) —</option>
              {flatCategories.filter(c => c.id !== editingId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Category"
          message="This will permanently delete the category. Categories with products or subcategories cannot be deleted."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}