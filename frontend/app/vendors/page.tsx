'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, ExternalLink, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/vendors').then(res => res.json()).then(data => setVendors(data.data || []))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">

      <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Verified Vendors</h1>
          <p className="text-muted-foreground">Agents exclusively interact with UCP-compliant vendors.</p>
        </div>
        <Link href="/vendors/register" passHref legacyBehavior>
          <Button asChild>
            <a>Register as Vendor</a>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <Card
            key={vendor.id}
            className="bg-card/50 border-border/50 p-6 hover:border-primary/50 transition-all group cursor-pointer"
            onClick={() => window.location.href = `/vendors/${vendor.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Store className="text-primary w-6 h-6" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono opacity-70">
                {vendor.pubkey.slice(0, 6)}...{vendor.pubkey.slice(-4)}
              </Badge>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{vendor.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{vendor.description}</p>
            <div className="flex items-center gap-4 border-t border-border/30 pt-4">
              <Link href={`/shop?vendorId=${vendor.id}`} className="text-xs font-bold flex items-center gap-1 hover:text-primary" onClick={e => e.stopPropagation()}>
                View Catalog <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="text-[10px] flex items-center gap-1 text-green-400 ml-auto">
                <ShieldCheck className="w-3 h-3" /> UCP Verified
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}