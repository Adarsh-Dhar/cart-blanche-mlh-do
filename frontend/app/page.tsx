'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CollectionsPreview } from '@/components/landing/collections-preview'
import { CTASection } from '@/components/landing/cta-section'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* ...header removed, use shared Header component instead... */}


      {/* Main Content */}
      <div className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <CollectionsPreview />
        <CTASection />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4 text-neon">Cart-Blanche</h3>
              <p className="text-sm text-muted-foreground">Welcome to the Future of Agentic Commerce</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-foreground transition">Collections</Link></li>
                <li><Link href="/shop" className="hover:text-foreground transition">New Arrivals</Link></li>
                <li><Link href="/shop" className="hover:text-foreground transition">Featured</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2026 Cart-Blanche. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="hover:text-foreground transition">Twitter</a>
              <a href="#" className="hover:text-foreground transition">Discord</a>
              <a href="#" className="hover:text-foreground transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
