'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { CollectionsPreview } from '@/components/landing/collections-preview'
import { CTASection } from '@/components/landing/cta-section'
import {
  Store, Zap, Lock, TrendingUp, Globe,
  ArrowRight, ChevronRight, ShieldCheck, Bot, Wallet
} from 'lucide-react'

const MERCHANT_PERKS = [
  {
    icon: Bot,
    title: 'AI Agent Distribution',
    desc: 'Your products are autonomously discovered and purchased by AI shopping agents on behalf of real buyers — 24/7, no effort required.',
  },
  {
    icon: Wallet,
    title: 'Instant Crypto Settlement',
    desc: 'Payments land in your wallet the moment a mandate is signed. USDCx on STACKS — no chargebacks, no waiting, no middlemen.',
  },
  {
    icon: ShieldCheck,
    title: 'UCP Verified Badge',
    desc: 'Get listed on our Universal Commerce Protocol registry. Verified merchants unlock priority placement in agent search results.',
  },
  {
    icon: TrendingUp,
    title: 'Zero Commission — Forever',
    desc: "We don't take a cut. Not now, not ever. List freely, sell freely, keep everything.",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Main Content */}
      <div className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <CollectionsPreview />

        {/* ── Merchant CTA Section ─────────────────────────────────────── */}
        <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Background atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-widest uppercase mb-6">
                <Store size={11} />
                Merchant Programme
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.05]">
                Sell to the agents.<br />
                <span className="text-neon" style={{ textShadow: '0 0 40px hsl(66,100%,50%,0.35)' }}>
                  They never sleep.
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Cart-Blanche turns your product catalogue into an AI-native storefront. No integration headaches — just list your products, connect your wallet, and let agents do the selling.
              </p>
            </div>

            {/* Perks grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
              {MERCHANT_PERKS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group relative rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-primary/40 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-2xl rounded-tr-2xl bg-gradient-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-200">
                    <Icon size={17} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2 leading-snug">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap justify-center gap-px mb-16">
              {[
                { value: '0%', label: 'Commission' },
                { value: '<2s', label: 'Settlement time' },
                { value: '24/7', label: 'Agent coverage' },
                { value: '∞', label: 'Listings allowed' },
              ].map(({ value, label }, i) => (
                <div
                  key={label}
                  className={`flex flex-col items-center justify-center px-10 py-6 bg-card/30 border border-border/30
                    ${i === 0 ? 'rounded-l-2xl' : ''}
                    ${i === 3 ? 'rounded-r-2xl' : ''}
                  `}
                >
                  <span className="text-3xl font-extrabold text-primary tracking-tight leading-none mb-1">
                    {value}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Main CTA card */}
            <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-card/80 backdrop-blur-md p-10 sm:p-14 overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-primary/70 mb-4">
                    Ready to join?
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-5">
                    Become a<br />
                    <span className="text-neon">verified merchant</span><br />
                    in minutes.
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                    Fill out our quick registration form, connect your crypto wallet, and your products go live to AI agents immediately. No approval delay, no hidden fees.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/merchant">
                      <Button
                        size="lg"
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 active:scale-[0.98]"
                      >
                        <Store size={16} />
                        Join as a Merchant
                        <ArrowRight size={15} />
                      </Button>
                    </Link>
                    <Link href="/vendors">
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2 border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200"
                      >
                        Browse Vendors
                        <ChevronRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Right: mini process */}
                <div className="flex flex-col gap-3">
                  {[
                    { step: '01', title: 'Register', desc: 'Fill a 2-minute Typeform — name, wallet address, catalogue URL.' },
                    { step: '02', title: 'Get verified', desc: 'Our system validates your pubkey and issues a UCP merchant badge.' },
                    { step: '03', title: 'List products', desc: 'Add products via the dashboard. Agents discover them instantly.' },
                    { step: '04', title: 'Earn on-chain', desc: 'Mandates are signed, orders are placed, USDC hits your wallet.' },
                  ].map(({ step, title, desc }, i) => (
                    <div
                      key={step}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border/30 bg-background/30 hover:border-primary/30 hover:bg-background/50 transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-full border border-primary/30 bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'hsl(66,100%,50%,0.08)' }}>
                        <span className="text-[10px] font-bold text-primary font-mono">{step}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none mb-1">{title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <CTASection />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 className="font-extrabold text-xl mb-3 text-neon tracking-tight">Cart-Blanche</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-5">
                The agentic commerce layer. AI agents discover, negotiate, and settle purchases on-chain — so your products sell while you sleep.
              </p>
              <Link href="/merchant">
                <Button size="sm" className="gap-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-bold">
                  <Store size={12} />
                  Become a Merchant
                </Button>
              </Link>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Shop</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-foreground transition-colors">Collections</Link></li>
                <li><Link href="/shop" className="hover:text-foreground transition-colors">New Arrivals</Link></li>
                <li><Link href="/shop" className="hover:text-foreground transition-colors">Featured</Link></li>
                <li><Link href="/vendors" className="hover:text-foreground transition-colors">Vendors</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Merchants</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/merchant" className="hover:text-foreground transition-colors">Register</Link></li>
                <li><Link href="/vendors" className="hover:text-foreground transition-colors">Directory</Link></li>
                <li><Link href="/admin/vendors" className="hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">UCP Docs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/30 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
            <div className="flex items-center gap-3">
              <p>&copy; 2026 Cart-Blanche. All rights reserved.</p>
              <span className="hidden sm:block text-border">·</span>
              <span className="hidden sm:flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                Powered by STACKS + x402
              </span>
            </div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">Discord</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}