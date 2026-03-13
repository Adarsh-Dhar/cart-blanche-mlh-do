"use client";

import React, { useState } from "react";
import { ShoppingBag, Store, Package, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

export interface ProductItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  currency: string;
  vendor: string;
  vendor_id: string;
  merchant_address: string;
  category: string;
  stock: number;
  images: string[];
}

export interface ProductListData {
  type: "product_list";
  products: ProductItem[];
  total: number;
  budget: number;
}

interface ProductListCardProps {
  data: ProductListData;
  onConfirm: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Stationery:  "text-sky-400 bg-sky-400/10 border-sky-400/20",
  Backpacks:   "text-violet-400 bg-violet-400/10 border-violet-400/20",
  Apparel:     "text-rose-400 bg-rose-400/10 border-rose-400/20",
  Electronics: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Clothing:    "text-rose-400 bg-rose-400/10 border-rose-400/20",
  Bags:        "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || "text-primary bg-primary/10 border-primary/20";
}

function getPlaceholderGradient(name: string): [string, string] {
  const palettes: [string, string][] = [
    ["#0f172a", "#1e3a5f"],
    ["#0f2a1a", "#1e5f3a"],
    ["#2a0f0f", "#5f1e1e"],
    ["#2a250f", "#5f571e"],
    ["#0f1f2a", "#1e4a5f"],
    ["#1f0f2a", "#4a1e5f"],
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

function ProductImage({ product }: { product: ProductItem }) {
  const [imgError, setImgError] = useState(false);
  const [bg, accent] = getPlaceholderGradient(product.name);

  if (product.images?.[0] && !imgError && !product.images[0].includes("placeholder")) {
    return (
      <img
        src={product.images[0]}
        alt={product.name}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)` }}
    >
      <span className="text-4xl font-black opacity-40 select-none text-white">
        {product.name.charAt(0)}
      </span>
    </div>
  );
}

export function ProductListCard({ data, onConfirm }: ProductListCardProps) {
  const { products, total, budget } = data;
  const savings = budget > 0 ? budget - total : 0;
  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border bg-card/60 shadow-xl">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-foreground">Your Cart</p>
            <p className="text-[11px] text-muted-foreground">{products.length} items · ready to buy</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-primary tabular-nums">${total.toFixed(2)}</p>
          {budget > 0 && (
            <p className="text-[11px] text-muted-foreground">of ${budget.toFixed(0)} budget</p>
          )}
        </div>
      </div>

      {/* ── Budget bar ── */}
      {budget > 0 && (
        <div className="px-5 py-3 border-b border-border">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">Budget usage</span>
            <span className={savings >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
              {savings >= 0 ? `$${savings.toFixed(2)} to spare` : `$${Math.abs(savings).toFixed(2)} over budget`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: pct > 95
                  ? "linear-gradient(90deg, #f97316, #ef4444)"
                  : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.6))",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Product grid ── */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="group rounded-xl overflow-hidden border border-border bg-background hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Image */}
            <div className="relative h-24 overflow-hidden bg-muted">
              <ProductImage product={product} />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {/* Category tag */}
              <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border backdrop-blur-sm ${getCategoryStyle(product.category)}`}>
                {product.category}
              </span>
              {/* Price */}
              <span className="absolute bottom-2 right-2 text-xs font-black text-white drop-shadow-sm">
                ${product.price.toFixed(2)}
              </span>
            </div>

            {/* Info */}
            <div className="px-3 py-2.5">
              <p className="text-[13px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-150">
                {product.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{product.vendor}</span>
                {product.stock > 0 && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 ml-auto flex-shrink-0">
                    <Package className="w-3 h-3" />
                    {product.stock}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer / CTA ── */}
      <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Happy with these picks? Click to proceed to checkout.
        </p>
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          style={{
            background: confirmed
              ? "hsl(var(--muted))"
              : "hsl(var(--primary))",
            color: confirmed
              ? "hsl(var(--muted-foreground))"
              : "hsl(var(--primary-foreground))",
            boxShadow: confirmed
              ? "none"
              : "0 0 24px hsl(var(--primary)/0.35), 0 4px 12px hsl(var(--primary)/0.2)",
          }}
        >
          {confirmed ? (
            <><CheckCircle2 className="w-4 h-4" /> Confirmed!</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Looks Good <ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}