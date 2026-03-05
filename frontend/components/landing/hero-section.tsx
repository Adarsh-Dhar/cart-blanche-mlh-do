'use client'

import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-futuristic pointer-events-none" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">

        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Welcome to the Future of Agentic Commerce</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-pretty">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground">
            The Ultimate
          </span>
          <br />
          <span>Shopping Orchestrator</span>
        </h1>

        <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Discover a new era of autonomous procurement. Powered by AI-driven mandates for the future of the agentic economy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/chat">Try AI Concierge</Link>
          </Button>
        </div>

        {/* Phone Mockup Preview */}
        <div className="relative mt-12 max-w-3xl mx-auto">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-2xl" />
          <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="aspect-video bg-gradient-to-b from-primary/20 to-card flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block p-8 rounded-2xl bg-card border border-border mb-4">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/50 rounded-xl flex items-center justify-center">
                    <span className="text-6xl">🛍️</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Experience the future of e-commerce</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Scroll to explore</span>
          <div className="w-6 h-10 border border-border rounded-full flex items-center justify-center">
            <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}
