'use client'

import Link from 'next/link'
import { Package, Store, Tag, ExternalLink, ShoppingBag, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ProductItem {
  id: string
  product_id: string
  name: string
  price: number
  currency: string
  vendor: string
  vendor_id: string
  category: string
  stock: number
  images: string[]
}

export interface ProductListData {
  type: 'product_list'
  products: ProductItem[]
  total: number
  budget: number
}

interface ProductListCardProps {
  data: ProductListData
  onConfirm?: () => void
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return (
    <span className="text-xs text-red-500 font-medium">Out of stock</span>
  )
  if (stock < 10) return (
    <span className="text-xs text-amber-500 font-medium">Only {stock} left</span>
  )
  return (
    <span className="text-xs text-green-600 font-medium">In stock</span>
  )
}

function BudgetBar({ total, budget }: { total: number; budget: number }) {
  if (!budget) return null
  const pct = Math.min((total / budget) * 100, 100)
  const over = total > budget
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Budget usage</span>
        <span className={over ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
          ${total.toFixed(2)} / ${budget.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ProductListCard({ data, onConfirm }: ProductListCardProps) {
  const { products, total, budget } = data
  const over = budget > 0 && total > budget
  const saved = budget > 0 && total < budget ? budget - total : 0

  return (
    <div className="w-full rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm my-3">

      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {products.length} item{products.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <span className={`text-sm font-bold ${over ? 'text-red-500' : 'text-primary'}`}>
          ${total.toFixed(2)}
        </span>
      </div>

      {/* ── Product rows ── */}
      <div className="divide-y divide-border/30">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
          >
            {/* Thumbnail */}
            <div className="w-11 h-11 rounded-lg overflow-hidden border border-border/30 bg-muted flex-shrink-0">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${product.id}`}
                className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
              >
                {product.name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {product.vendor}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {product.category}
                </span>
                <StockBadge stock={product.stock} />
              </div>
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-bold text-primary">
                ${product.price.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">{product.currency}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-border/40 bg-muted/10 space-y-3">
        {budget > 0 && <BudgetBar total={total} budget={budget} />}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {saved > 0 && (
              <span className="text-green-600 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Saving ${saved.toFixed(2)} vs budget
              </span>
            )}
            {over && (
              <span className="text-red-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ${(total - budget).toFixed(2)} over budget
              </span>
            )}
            {!saved && !over && budget > 0 && (
              <span className="flex items-center gap-1">
                <Minus className="w-3 h-3" /> Exactly at budget
              </span>
            )}
          </div>

          {onConfirm && (
            <Button
              size="sm"
              onClick={onConfirm}
              className="text-xs flex-shrink-0"
            >
              ✓ Looks Good — ${total.toFixed(2)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}