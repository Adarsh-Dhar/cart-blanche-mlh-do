'use client'

import { useState } from 'react'
import { ShoppingBag, Store, Shield, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MandateVendor {
  name: string
  merchant_address: string
  amount: number
  products?: { name: string; price: number }[]
}

export interface CartMandateData {
  merchant_address: string
  amount: number
  total_budget_amount?: number
  currency: string
  chain_id?: number
  merchants: MandateVendor[]
}

interface CartMandateCardProps {
  mandate: CartMandateData
  onSign: (mandate: CartMandateData) => Promise<void>
}

export function CartMandateCard({ mandate, onSign }: CartMandateCardProps) {
  const [status, setStatus] = useState<'idle' | 'signing' | 'done' | 'cancelled'>('idle')
  const total = mandate.amount || mandate.total_budget_amount || 0

  const handleSign = async () => {
    setStatus('signing')
    try {
      await onSign(mandate)
      setStatus('done')
    } catch {
      setStatus('cancelled')
    }
  }

  return (
    <div className="w-full rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden bg-card shadow-sm my-3">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
            Payment Authorisation Required
          </span>
        </div>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
          ${total.toFixed(2)} {mandate.currency}
        </span>
      </div>

      {/* Vendor breakdown */}
      <div className="divide-y divide-border/30">
        {mandate.merchants.map((vendor, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">{vendor.name}</span>
              </div>
              <span className="text-sm font-semibold text-primary">
                ${vendor.amount.toFixed(2)}
              </span>
            </div>
            {vendor.products && vendor.products.length > 0 && (
              <ul className="ml-5 space-y-0.5">
                {vendor.products.map((p, j) => (
                  <li key={j} className="flex justify-between text-xs text-muted-foreground">
                    <span className="truncate mr-2">{p.name}</span>
                    <span className="flex-shrink-0">${p.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Footer: wallet + sign button */}
      <div className="px-4 py-3 border-t border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Clicking <strong>Sign &amp; Pay</strong> will open your wallet (MetaMask) to
          authorise a <strong>${total.toFixed(2)} {mandate.currency}</strong> EIP-712
          CartMandate. No funds move until you approve in your wallet.
        </p>

        <div className="flex items-center gap-3">
          {status === 'idle' && (
            <Button
              onClick={handleSign}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              <Shield className="w-4 h-4" />
              Sign &amp; Pay ${total.toFixed(2)}
            </Button>
          )}
          {status === 'signing' && (
            <Button disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for wallet…
            </Button>
          )}
          {status === 'done' && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Signed — processing payment…
            </div>
          )}
          {status === 'cancelled' && (
            <>
              <p className="text-xs text-red-500">Signature cancelled.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatus('idle')}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}