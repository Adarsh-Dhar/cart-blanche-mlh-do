'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Eye, Plus, Search } from 'lucide-react'
import {
  Modal, ConfirmDialog, Field, Input, Textarea, Btn,
  Toast, EmptyState, PageHeader, Table, Pagination,
} from '@/components/admin/ui'
import { vendorsApi, Vendor, ApiError } from '@/lib/api-client'

const emptyForm = { name: '', description: '', logoUrl: '', pubkey: '' }

export default function VendorsPage() {
  const [vendors,    setVendors]    = useState<Vendor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)
  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await vendorsApi.list({ page, limit: 15, search: debouncedSearch || undefined })
      setVendors(res.data)
      setTotal(res.meta.total)
      setTotalPages(res.meta.totalPages)
    } catch {
      setToast({ msg: 'Failed to load vendors', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true) }
  const openEdit   = (v: Vendor) => {
    setForm({ name: v.name, description: v.description ?? '', logoUrl: v.logoUrl ?? '', pubkey: v.pubkey })
    setEditingId(v.id); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim())  return setToast({ msg: 'Name is required', type: 'error' })
    if (!form.pubkey.trim()) return setToast({ msg: 'Public key is required', type: 'error' })
    setSaving(true)
    try {
      if (editingId) {
        await vendorsApi.update(editingId, form)
        setToast({ msg: 'Vendor updated', type: 'success' })
      } else {
        await vendorsApi.create(form)
        setToast({ msg: 'Vendor created', type: 'success' })
      }
      setShowForm(false); load()
    } catch (e) {
      setToast({ msg: e instanceof ApiError ? e.message : 'Save failed', type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await vendorsApi.delete(deleteId)
      setToast({ msg: 'Vendor deleted', type: 'success' })
      setDeleteId(null); load()
    } catch (e) {
      setToast({ msg: e instanceof ApiError ? e.message : 'Delete failed', type: 'error' })
      setDeleteId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={`${total} merchants registered`}
        action={<Btn onClick={openCreate}><Plus size={14} />New Vendor</Btn>}
      />

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a5568', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, pubkey…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#080c10', border: '1px solid #1a2332', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => (e.target.style.borderColor = '#00ff9d66')}
          onBlur={e  => (e.target.style.borderColor = '#1a2332')}
        />
      </div>

      <div style={{ background: '#0d1117', border: '1px solid #1a2332', borderRadius: 12, overflow: 'hidden' }}>
        <Table headers={['Vendor', 'Pubkey', 'Products', 'Orders', 'Created', 'Actions']} loading={loading}>
          {!loading && vendors.length === 0 ? (
            <tr><td colSpan={6}><EmptyState message="No vendors found" action={<Btn onClick={openCreate}><Plus size={14} />New Vendor</Btn>} /></td></tr>
          ) : vendors.map(v => (
            <tr key={v.id}
              style={{ borderBottom: '1px solid #1a233240', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ffffff05'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {v.logoUrl
                    ? <img src={v.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid #1a2332' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div style={{ width: 32, height: 32, background: '#1a2332', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4a5568' }}>{v.name[0]?.toUpperCase()}</div>
                  }
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: 11, color: '#4a5568', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</div>}
                  </div>
                </div>
              </td>
              <td style={{ padding: '14px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a5568', background: '#1a2332', padding: '2px 8px', borderRadius: 4 }}>
                  {v.pubkey.slice(0, 14)}…
                </span>
              </td>
              <td style={{ padding: '14px', color: '#94a3b8' }}>{v._count?.products ?? '—'}</td>
              <td style={{ padding: '14px', color: '#94a3b8' }}>{v._count?.orders   ?? '—'}</td>
              <td style={{ padding: '14px', color: '#4a5568', fontSize: 12 }}>{new Date(v.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/admin/vendors/${v.id}`}>
                    <Btn variant="secondary" size="sm"><Eye size={13} /></Btn>
                  </Link>
                  <Btn variant="ghost"   size="sm" onClick={() => openEdit(v)}><Pencil size={13} /></Btn>
                  <Btn variant="danger"  size="sm" onClick={() => { setDeleteId(v.id); setDeleteName(v.name) }}><Trash2 size={13} /></Btn>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <div style={{ padding: '16px', borderTop: '1px solid #1a2332', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#4a5568' }}>Showing {vendors.length} of {total}</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Edit Vendor' : 'New Vendor'} onClose={() => setShowForm(false)}>
          <Field label="Name" required><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Acme Corp" /></Field>
          <Field label="Public Key" required><Input value={form.pubkey} onChange={v => setForm(f => ({ ...f, pubkey: v }))} placeholder="ST…" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief description…" /></Field>
          <Field label="Logo URL"><Input value={form.logoUrl} onChange={v => setForm(f => ({ ...f, logoUrl: v }))} placeholder="https://…" /></Field>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</Btn>
          </div>
        </Modal>
      )}

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