'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye } from 'lucide-react'
import {
  Modal, ConfirmDialog, Field, Input, Textarea, Btn,
  Toast, EmptyState, SearchBar, PageHeader, Table, Pagination
} from '@/components/admin/ui'

const API = process.env.NEXT_PUBLIC_API_URL || ''

interface Vendor {
  id: string; name: string; description?: string; logoUrl?: string; pubkey: string;
  createdAt: string; _count?: { products: number; orders: number }
}

const emptyForm = { name: '', description: '', logoUrl: '', pubkey: '' }

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/vendors?page=${page}&limit=10`)
      const data = await res.json()
      setVendors(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
      setTotal(data.meta?.total || 0)
    } catch {
      setToast({ msg: 'Failed to load vendors.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.pubkey.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (v: Vendor) => {
    setForm({ name: v.name, description: v.description || '', logoUrl: v.logoUrl || '', pubkey: v.pubkey })
    setEditingId(v.id)
    setShowForm(true)
  }

  const openDelete = (v: Vendor) => {
    setDeleteId(v.id)
    setDeleteName(v.name)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.pubkey.trim()) {
      return setToast({ msg: 'Name and Public Key are required.', type: 'error' })
    }
    setSaving(true)
    try {
      const url = editingId ? `${API}/api/vendors/${editingId}` : `${API}/api/vendors`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save vendor.')
      setToast({ msg: editingId ? 'Vendor updated.' : 'Vendor created.', type: 'success' })
      setShowForm(false)
      load()
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API}/api/vendors/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete vendor.')
      setToast({ msg: 'Vendor deleted.', type: 'success' })
      setDeleteId(null)
      load()
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
      setDeleteId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={`${total} merchants registered`}
        action={<Btn onClick={openCreate}>+ New Vendor</Btn>}
      />

      <div style={{ marginBottom: '16px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search name or pubkey…" />
      </div>

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
        <Table headers={['Vendor', 'Pubkey', 'Products', 'Orders', 'Created', 'Actions']} loading={loading}>
          {filtered.length === 0 && !loading ? (
            <tr>
              <td colSpan={6}>
                <EmptyState message="No vendors found" action={<Btn onClick={openCreate}>+ New Vendor</Btn>} />
              </td>
            </tr>
          ) : filtered.map(v => (
            <tr key={v.id}
              style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {v.logoUrl
                    ? <img src={v.logoUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #1a2332' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div style={{ width: '32px', height: '32px', background: '#1a2332', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#4a5568' }}>{v.name[0]?.toUpperCase()}</div>
                  }
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: '11px', color: '#4a5568', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</div>}
                  </div>
                </div>
              </td>
              <td style={{ padding: '14px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4a5568', background: '#1a2332', padding: '2px 8px', borderRadius: '4px' }}>
                  {v.pubkey.slice(0, 16)}…
                </span>
              </td>
              <td style={{ padding: '14px', color: '#94a3b8' }}>{v._count?.products ?? '—'}</td>
              <td style={{ padding: '14px', color: '#94a3b8' }}>{v._count?.orders ?? '—'}</td>
              <td style={{ padding: '14px', color: '#4a5568', fontSize: '12px' }}>{new Date(v.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Link href={`/admin/vendors/${v.id}`}>
                    <Btn variant="secondary" size="sm"><Eye size={13} /></Btn>
                  </Link>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(v)}><Pencil size={13} /></Btn>
                  <Btn variant="danger" size="sm" onClick={() => openDelete(v)}><Trash2 size={13} /></Btn>
                </div>
              </td>
              <td>
                <Link href={`/admin/vendors/${v.id}`}>
                  <Btn variant="secondary" size="sm">View</Btn>
                </Link>
              </td>
            </tr>
          ))}
        </Table>

        <div style={{ padding: '16px', borderTop: '1px solid #1a2332', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Showing {filtered.length} of {total}</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <Modal title={editingId ? 'Edit Vendor' : 'New Vendor'} onClose={() => setShowForm(false)}>
          <Field label="Name" required>
            <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Acme Corp" />
          </Field>
          <Field label="Public Key" required>
            <Input value={form.pubkey} onChange={v => setForm(f => ({ ...f, pubkey: v }))} placeholder="0x…" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief vendor description…" />
          </Field>
          <Field label="Logo URL">
            <Input value={form.logoUrl} onChange={v => setForm(f => ({ ...f, logoUrl: v }))} placeholder="https://example.com/logo.png" />
          </Field>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Vendor'}</Btn>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Vendor"
          message={`Delete "${deleteName}"? Vendors with products cannot be deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}