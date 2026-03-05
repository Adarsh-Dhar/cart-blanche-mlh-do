'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Ready to Experience the Future?
        </h2>

        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of users discovering space-themed fashion with our AI-powered shopping concierge
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Link href="/shop">
              Start Shopping Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/chat">Launch AI Concierge</Link>
          </Button>
        </div>

        <div className="mt-12 pt-12 border-t border-border/30">
          <p className="text-muted-foreground mb-6">Trusted by innovative thinkers</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="text-muted-foreground font-semibold">🌟 Premium Quality</div>
            <div className="w-px h-6 bg-border/30" />
            <div className="text-muted-foreground font-semibold">🔒 Secure Payment</div>
            <div className="w-px h-6 bg-border/30" />
            <div className="text-muted-foreground font-semibold">⚡ Fast Delivery</div>
          </div>
        </div>
      </div>
    </section>
  )
}
