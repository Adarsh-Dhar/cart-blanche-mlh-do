'use client'

import { X, AlertTriangle, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

// ─── Modal ───────────────────────────────────────────────
export function Modal({ title, onClose, children, width = '480px' }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: string
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
      <div style={{ position: 'relative', background: '#0d1117', border: '1px solid #1a2332', borderRadius: '16px', width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1a2332' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <Modal title={title} onClose={onCancel} width="400px">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <AlertTriangle size={20} color={danger ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #1a2332', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{ padding: '8px 16px', background: danger ? '#ef444420' : '#f59e0b20', border: `1px solid ${danger ? '#ef4444' : '#f59e0b'}60`, borderRadius: '8px', color: danger ? '#ef4444' : '#f59e0b', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}

// ─── Form Field ───────────────────────────────────────────
export function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '11px', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

// ─── Input ───────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', disabled, step }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; step?: string
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px', background: '#080c10',
        border: '1px solid #1a2332', borderRadius: '8px', color: '#e2e8f0',
        fontSize: '13px', outline: 'none', fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
      }}
      onFocus={e => (e.target as HTMLElement).style.borderColor = '#00ff9d66'}
      onBlur={e => (e.target as HTMLElement).style.borderColor = '#1a2332'}
    />
  )
}

// ─── Textarea ────────────────────────────────────────────
export function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', background: '#080c10',
        border: '1px solid #1a2332', borderRadius: '8px', color: '#e2e8f0',
        fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
      }}
      onFocus={e => (e.target as HTMLElement).style.borderColor = '#00ff9d66'}
      onBlur={e => (e.target as HTMLElement).style.borderColor = '#1a2332'}
    />
  )
}

// ─── Select ──────────────────────────────────────────────
export function Select({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px', background: '#080c10',
        border: '1px solid #1a2332', borderRadius: '8px', color: '#e2e8f0',
        fontSize: '13px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </select>
  )
}

// ─── Button ──────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'secondary'; size?: 'sm' | 'md'; disabled?: boolean; type?: 'button' | 'submit'
}) {
  const styles: Record<string, any> = {
    primary: { background: '#00ff9d20', border: '1px solid #00ff9d60', color: '#00ff9d' },
    ghost: { background: 'transparent', border: '1px solid #1a2332', color: '#94a3b8' },
    danger: { background: '#ef444420', border: '1px solid #ef444460', color: '#ef4444' },
    secondary: { background: '#3b82f620', border: '1px solid #3b82f660', color: '#3b82f6' },
  }
  const sizes = { sm: { padding: '6px 12px', fontSize: '12px' }, md: { padding: '9px 16px', fontSize: '13px' } }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles[variant], ...sizes[size], borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  )
}

// ─── Toast ───────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }: {
  message: string; type?: 'success' | 'error'; onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
      background: type === 'success' ? '#00ff9d15' : '#ef444415',
      border: `1px solid ${type === 'success' ? '#00ff9d40' : '#ef444440'}`,
      borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
      color: type === 'success' ? '#00ff9d' : '#ef4444', fontSize: '13px', maxWidth: '320px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '2px' }}><X size={13} /></button>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────
export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#4a5568' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>◇</div>
      <div style={{ fontSize: '14px', marginBottom: '16px' }}>{message}</div>
      {action}
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────
export function Badge({ label, color = '#64748b' }: { label: string; color?: string }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: color + '20', color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  )
}

// ─── Search Bar ──────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568', fontSize: '14px' }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#080c10', border: '1px solid #1a2332', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
        onFocus={e => (e.target as HTMLElement).style.borderColor = '#00ff9d66'}
        onBlur={e => (e.target as HTMLElement).style.borderColor = '#1a2332'}
      />
    </div>
  )
}

// ─── Page Header ─────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>◆ {title}</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#e2e8f0', fontFamily: "'Syne', sans-serif", margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: '#4a5568', fontSize: '13px', marginTop: '4px' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── Table ───────────────────────────────────────────────
export function Table({ headers, children, loading }: { headers: string[]; children: React.ReactNode; loading?: boolean }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#4a5568', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1a2332', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {headers.map((h, j) => (
                <td key={j} style={{ padding: '14px', borderBottom: '1px solid #1a233240' }}>
                  <div style={{ height: '14px', background: '#1a2332', borderRadius: '4px', width: j === 0 ? '60%' : '80%', animation: 'pulse 1.5s infinite' }} />
                </td>
              ))}
            </tr>
          ))
        ) : children}
        </tbody>
      </table>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (page <= 4) return i + 1
    if (page >= totalPages - 3) return totalPages - 6 + i
    return page - 3 + i
  })
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', paddingTop: '20px' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #1a2332', borderRadius: '6px', color: '#64748b', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: page === 1 ? 0.4 : 1 }}>←</button>
      {pages.map(p => (
        <button key={p} onClick={() => onPage(p)} style={{ padding: '6px 10px', background: p === page ? '#00ff9d20' : 'transparent', border: `1px solid ${p === page ? '#00ff9d60' : '#1a2332'}`, borderRadius: '6px', color: p === page ? '#00ff9d' : '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: p === page ? 600 : 400 }}>{p}</button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #1a2332', borderRadius: '6px', color: '#64748b', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: page === totalPages ? 0.4 : 1 }}>→</button>
    </div>
  )
}