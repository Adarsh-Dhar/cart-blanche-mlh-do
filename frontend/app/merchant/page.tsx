'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Zap, Store, ArrowRight, ChevronRight, Globe, Lock, TrendingUp } from 'lucide-react'

const PERKS = [
  {
    icon: Zap,
    title: 'AI-Powered Sales',
    desc: 'Cart-Blanche agents autonomously discover and purchase your products on behalf of buyers.',
  },
  {
    icon: Lock,
    title: 'Crypto Settlement',
    desc: 'Receive instant USDC payments via EIP-712 signed mandates — no chargebacks, no middlemen.',
  },
  {
    icon: Globe,
    title: 'UCP Compliant',
    desc: 'Get verified on our Universal Commerce Protocol registry and unlock agent-first distribution.',
  },
  {
    icon: TrendingUp,
    title: 'Zero Commission',
    desc: 'Keep 100% of every sale. We charge nothing on transactions — ever.',
  },
]

const STEPS = [
  { num: '01', label: 'Fill the form' },
  { num: '02', label: 'Connect your wallet' },
  { num: '03', label: 'List products' },
  { num: '04', label: 'Start selling' },
]

export default function MerchantRegisterPage() {
  const [formReady, setFormReady] = useState(false)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    // Inject Typeform embed script if not already present
    if (document.querySelector('script[src="//embed.typeform.com/next/embed.js"]')) {
      setFormReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = '//embed.typeform.com/next/embed.js'
    script.async = true
    script.onload = () => setFormReady(true)
    document.body.appendChild(script)
    scriptRef.current = script
    return () => {
      // Leave script in DOM — removing causes Typeform to break on re-mount
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        .merchant-page { font-family: 'Syne', sans-serif; }

        /* Grid noise texture overlay */
        .noise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }

        .glow-line {
          background: linear-gradient(90deg, transparent, hsl(66,100%,50%,0.6), transparent);
          height: 1px;
        }

        .perk-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 24px;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }
        .perk-card:hover {
          border-color: hsl(66,100%,50%,0.35);
          background: rgba(205,220,57,0.04);
          transform: translateY(-2px);
        }

        .step-dot {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 1px solid hsl(66,100%,50%,0.4);
          background: hsl(66,100%,50%,0.08);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: hsl(66,100%,50%);
          font-weight: 500;
          flex-shrink: 0;
        }

        .typeform-wrapper {
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 80px hsl(66,100%,50%,0.06), 0 0 0 1px rgba(255,255,255,0.04);
          min-height: 560px;
          background: #0d0f0a;
          position: relative;
        }

        .typeform-wrapper [data-tf-live] {
          width: 100% !important;
          min-height: 560px !important;
        }

        /* Skeleton loader for Typeform */
        .tf-skeleton {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #0d0f0a;
          z-index: 2;
          transition: opacity 0.4s;
        }
        .tf-skeleton.hidden { opacity: 0; pointer-events: none; }

        .skeleton-bar {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid hsl(66,100%,50%,0.3);
          background: hsl(66,100%,50%,0.08);
          color: hsl(66,100%,50%);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }
        .fade-up-5 { animation-delay: 0.45s; }
      `}</style>

      <div className="merchant-page noise-bg min-h-screen" style={{ background: '#080a06', color: '#e8eadf', position: 'relative' }}>

        {/* Ambient glow blobs */}
        <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, hsl(66,100%,50%,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, hsl(66,100%,50%,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

          {/* Top nav breadcrumb */}
          <div className="fade-up fade-up-1" style={{ paddingTop: 32, paddingBottom: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 13, fontFamily: "'DM Mono', monospace", transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'hsl(66,100%,50%)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >Cart-Blanche</Link>
            <ChevronRight size={12} color="rgba(255,255,255,0.2)" />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>merchant</span>
            <ChevronRight size={12} color="rgba(255,255,255,0.2)" />
            <span style={{ color: 'hsl(66,100%,50%)', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>register</span>
          </div>

          {/* Hero */}
          <div className="fade-up fade-up-2" style={{ marginBottom: 64 }}>
            <div style={{ marginBottom: 20 }}>
              <span className="badge-pill"><Store size={11} /> Merchant Programme</span>
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 20px', maxWidth: 720 }}>
              Sell to AI agents.<br />
              <span style={{ color: 'hsl(66,100%,50%)', textShadow: '0 0 40px hsl(66,100%,50%,0.3)' }}>Get paid instantly.</span>
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 540, margin: 0 }}>
              Join the Cart-Blanche merchant network. Your products become discoverable by AI shopping agents — and settlement happens on-chain, automatically.
            </p>
          </div>

          {/* Main layout: form left, perks right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'start' }}>

            {/* Typeform */}
            <div className="fade-up fade-up-3">
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="glow-line" style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Registration Form
                </span>
                <div className="glow-line" style={{ flex: 1 }} />
              </div>

              <div className="typeform-wrapper">
                {/* Skeleton shown until Typeform script loads */}
                <div className={`tf-skeleton${formReady ? ' hidden' : ''}`}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'hsl(66,100%,50%,0.1)', border: '1px solid hsl(66,100%,50%,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Store size={18} color="hsl(66,100%,50%)" />
                  </div>
                  <div className="skeleton-bar" style={{ width: 180, height: 14 }} />
                  <div className="skeleton-bar" style={{ width: 240, height: 10, marginTop: 4 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, width: '80%' }}>
                    {[200, 160, 220, 140].map((w, i) => (
                      <div key={i} className="skeleton-bar" style={{ width: '100%', height: 44, borderRadius: 10 }} />
                    ))}
                  </div>
                </div>

                {/* Typeform embed */}
                <div data-tf-live="01KKRKBZAQT84M4YQNVZ69SC6X" style={{ width: '100%', minHeight: 560 }} />
              </div>

              <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace", textAlign: 'center' }}>
                Powered by Typeform · Your data is encrypted in transit
              </p>
            </div>

            {/* Right column */}
            <div className="fade-up fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 32, position: 'sticky', top: 32 }}>

              {/* Process steps */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 18, fontFamily: "'DM Mono', monospace" }}>
                  How it works
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STEPS.map((step, i) => (
                    <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                      {/* Vertical connector */}
                      {i < STEPS.length - 1 && (
                        <div style={{ position: 'absolute', left: 17, top: 36, width: 1, height: 24, background: 'linear-gradient(180deg, hsl(66,100%,50%,0.3), transparent)' }} />
                      )}
                      <div className="step-dot">{step.num}</div>
                      <div style={{ paddingTop: 12, paddingBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{step.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glow-line" />

              {/* Perks */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 18, fontFamily: "'DM Mono', monospace" }}>
                  Why join
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PERKS.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="perk-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'hsl(66,100%,50%,0.1)', border: '1px solid hsl(66,100%,50%,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <Icon size={14} color="hsl(66,100%,50%)" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{title}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glow-line" />

              {/* Already registered CTA */}
              <div style={{ background: 'hsl(66,100%,50%,0.05)', border: '1px solid hsl(66,100%,50%,0.15)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldCheck size={14} color="hsl(66,100%,50%)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(66,100%,50%)' }}>Already registered?</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14, lineHeight: 1.6 }}>
                  View your vendor profile, manage products, and track orders from the admin panel.
                </p>
                <Link href="/admin/vendors" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'hsl(66,100%,50%)', textDecoration: 'none', padding: '8px 16px', background: 'hsl(66,100%,50%,0.1)', border: '1px solid hsl(66,100%,50%,0.25)', borderRadius: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(66,100%,50%,0.18)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(66,100%,50%,0.1)' }}
                >
                  Vendor Dashboard <ArrowRight size={12} />
                </Link>
              </div>

            </div>
          </div>

          {/* Footer strip */}
          <div className="fade-up fade-up-5" style={{ marginTop: 80, paddingTop: 32, paddingBottom: 40, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" }}>
              © 2026 Cart-Blanche · Universal Commerce Protocol
            </span>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Privacy', 'Terms', 'Docs'].map(item => (
                <a key={item} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', fontFamily: "'DM Mono', monospace", transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                >{item}</a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}