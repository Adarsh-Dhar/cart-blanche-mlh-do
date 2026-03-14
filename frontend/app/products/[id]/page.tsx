'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag,
  Store, Tag, Package, Zap, CheckCircle2, AlertCircle, Clock
} from 'lucide-react'

interface Product {
  id: string
  productID: string
  sku: string
  gtin?: string
  mpn?: string
  name: string
  description: string
  price: string
  currency: string
  stockQuantity: number
  availability: string
  condition: string
  images: string[]
  vendor: { id: string; name: string; description?: string; logoUrl?: string }
  category: { id: string; name: string; slug: string; parent?: { name: string } | null }
  createdAt: string
  updatedAt: string
}

function StockStatus({ qty, availability }: { qty: number; availability: string }) {
  if (qty === 0 || availability === 'OUT_OF_STOCK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-400">
        <AlertCircle className="w-4 h-4" /> Out of Stock
      </span>
    )
  }
  if (availability === 'PRE_ORDER') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
        <Clock className="w-4 h-4" /> Pre-Order
      </span>
    )
  }
  if (qty < 10) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
        <Package className="w-4 h-4" /> Only {qty} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
      <CheckCircle2 className="w-4 h-4" /> In Stock ({qty} units)
    </span>
  )
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const [error, setError] = useState<Record<number, boolean>>({})

  if (!images.length) {
    return (
      <div
        className="w-full aspect-square rounded-2xl flex items-center justify-center text-7xl font-black select-none"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: 'rgba(255,255,255,0.15)' }}
      >
        {name.charAt(0)}
      </div>
    )
  }

  const valid = images.filter((_, i) => !error[i])
  const safeIdx = Math.min(idx, valid.length - 1)

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10"
        style={{ background: '#0a0f18' }}
      >
        {!error[safeIdx] ? (
          <img
            src={images[safeIdx]}
            alt={name}
            className="w-full h-full object-contain p-4"
            onError={() => setError(e => ({ ...e, [safeIdx]: true }))}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl font-black select-none"
            style={{ color: 'rgba(255,255,255,0.12)' }}>
            {name.charAt(0)}
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === safeIdx ? 'hsl(66,100%,50%)' : 'rgba(255,255,255,0.25)' }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
              style={{
                borderColor: i === safeIdx ? 'hsl(66,100%,50%)' : 'rgba(255,255,255,0.08)',
                background: '#0a0f18'
              }}
            >
              {!error[i] ? (
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-contain p-1"
                  onError={() => setError(e => ({ ...e, [i]: true }))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                  style={{ color: 'rgba(255,255,255,0.15)' }}>
                  {name.charAt(0)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) { router.push('/shop'); return }
      const data = await res.json()
      setProduct(data.data)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <p className="text-muted-foreground">This product doesn&apos;t exist or has been removed.</p>
        <Link href="/shop" className="text-primary hover:underline text-sm font-medium">
          ← Back to Shop
        </Link>
      </div>
    )
  }

  const price = parseFloat(product.price)
  const inStock = product.stockQuantity > 0 && product.availability !== 'OUT_OF_STOCK' && product.availability !== 'DISCONTINUED'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/shop" className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Shop
        </Link>
        {product.category.parent && (
          <>
            <span className="text-border">/</span>
            <span>{product.category.parent.name}</span>
          </>
        )}
        <span className="text-border">/</span>
        <span className="text-foreground">{product.category.name}</span>
        <span className="text-border">/</span>
        <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* Left: Image gallery */}
        <ImageGallery images={product.images} name={product.name} />

        {/* Right: Product info */}
        <div className="space-y-6">

          {/* Category pill + condition */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/shop?categoryId=${product.category.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-colors hover:border-primary/50"
              style={{ background: 'hsl(66,100%,50%,0.08)', borderColor: 'hsl(66,100%,50%,0.2)', color: 'hsl(66,100%,50%)' }}
            >
              <Tag className="w-3 h-3" />
              {product.category.name}
            </Link>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
              {product.condition}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
            {product.name}
          </h1>

          {/* SKU */}
          <p className="font-mono text-xs text-muted-foreground/60">
            SKU: {product.sku} {product.gtin && `· GTIN: ${product.gtin}`}
          </p>

          {/* Price block */}
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'linear-gradient(135deg, hsl(66,100%,50%,0.06) 0%, transparent 100%)',
              borderColor: 'hsl(66,100%,50%,0.2)'
            }}
          >
            <div className="flex items-end gap-3">
              <span
                className="text-5xl font-black tabular-nums"
                style={{ color: 'hsl(66,100%,50%)', textShadow: '0 0 20px hsl(66,100%,50%,0.3)' }}
              >
                ${price.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-sm font-medium mb-1">{product.currency}</span>
            </div>
            <div className="mt-3">
              <StockStatus qty={product.stockQuantity} availability={product.availability} />
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">About this product</h3>
            <p className="text-muted-foreground leading-relaxed text-[15px]">{product.description}</p>
          </div>

          {/* Vendor */}
          <div
            className="flex items-center gap-4 rounded-xl p-4 border"
            style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              {product.vendor.logoUrl ? (
                <img src={product.vendor.logoUrl} alt={product.vendor.name} className="w-full h-full object-contain rounded-xl" />
              ) : (
                <Store className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Sold by</p>
              <Link
                href={`/vendors/${product.vendor.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors"
              >
                {product.vendor.name}
              </Link>
            </div>
            {inStock && (
              <div className="flex-shrink-0">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">
                  UCP Verified
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/chat"
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: inStock ? 'hsl(66,100%,50%)' : 'hsl(0,0%,20%)',
                color: inStock ? '#000' : '#666',
                cursor: inStock ? 'pointer' : 'not-allowed',
                boxShadow: inStock ? '0 0 24px hsl(66,100%,50%,0.35), 0 4px 12px hsl(66,100%,50%,0.2)' : 'none',
                pointerEvents: inStock ? 'auto' : 'none',
              }}
            >
              <Zap className="w-4 h-4" />
              {inStock ? 'Buy with AI Agent' : 'Out of Stock'}
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground/50">
            Powered by Cart-Blanche · x402 crypto settlement on SKALE
          </p>
        </div>
      </div>

      {/* Bottom metadata strip */}
      <div
        className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: 'Product ID', value: product.productID, mono: true },
          { label: 'Condition', value: product.condition },
          { label: 'Listed', value: new Date(product.createdAt).toLocaleDateString() },
          { label: 'Last Updated', value: new Date(product.updatedAt).toLocaleDateString() },
        ].map(({ label, value, mono }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ background: '#080c10', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-sm text-foreground truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}