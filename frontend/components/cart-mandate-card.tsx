'use client'

import { useState } from 'react'
import { ShoppingBag, Store, Shield, Loader2, CheckCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
    <Card className="w-full max-w-md border-primary/20 bg-background/50 backdrop-blur-sm shadow-xl my-4 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight">Payment Authorization</CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">EIP-712 CartMandate</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-primary">
              ${total.toFixed(2)}
            </span>
            <p className="text-[10px] text-muted-foreground">{mandate.currency}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Vendor breakdown */}
        <div className="space-y-4">
          {mandate.merchants.map((vendor, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{vendor.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  ${vendor.amount.toFixed(2)}
                </span>
              </div>
              
              {vendor.products && vendor.products.length > 0 && (
                <div className="pl-6 space-y-1.5 border-l-2 border-primary/10 ml-2">
                  {vendor.products.map((p, j) => (
                    <div key={j} className="flex justify-between text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>{p.name}</span>
                      <span className="font-mono">${p.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator className="bg-primary/10" />

        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
          <Wallet className="w-4 h-4 text-primary mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-normal">
            Authorizing this mandate grants the agent permission to settle the 
            total <strong>${total.toFixed(2)}</strong> across the merchants listed above. 
            Confirming in MetaMask is required to proceed.
          </p>
        </div>
      </CardContent>

      <CardFooter className="bg-primary/5 pt-4 border-t border-primary/10 flex flex-col gap-3">
        {status === 'idle' && (
          <Button
            onClick={handleSign}
            className="w-full gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all active:scale-[0.98]"
          >
            <Shield className="w-4 h-4" />
            Sign & Pay ${total.toFixed(2)}
          </Button>
        )}

        {status === 'signing' && (
          <Button disabled className="w-full gap-2 bg-muted text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for wallet response...
          </Button>
        )}

        {status === 'done' && (
          <div className="flex items-center justify-center gap-2 p-2 w-full bg-green-500/10 text-green-500 rounded-md border border-green-500/20 text-sm font-bold">
            <CheckCircle className="w-4 h-4" />
            Authorization Successful
          </div>
        )}

        {status === 'cancelled' && (
          <div className="w-full space-y-2">
            <p className="text-center text-[11px] text-destructive font-medium">Signature was denied or failed.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatus('idle')}
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Try Authorizing Again
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}