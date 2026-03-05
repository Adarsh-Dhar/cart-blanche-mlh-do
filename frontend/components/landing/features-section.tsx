'use client'

import { ShoppingBag, Zap, Lock, BarChart3, Cpu, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'

const features = [
  {
    icon: ShoppingBag,
    title: 'Smart Discovery',
    description: 'AI-powered recommendations tailored to your style and budget',
  },
  {
    icon: Zap,
    title: 'Instant Checkout',
    description: 'Streamlined payment with Web3 integration and multiple wallets',
  },
  {
    icon: Lock,
    title: 'Secure Mandates',
    description: 'Cryptographic authorization for all transactions',
  },
  {
    icon: BarChart3,
    title: 'Real-time Tracking',
    description: 'Monitor agent activities and settlements in real-time',
  },
  {
    icon: Cpu,
    title: 'AI Agent',
    description: 'Autonomous shopping concierge that negotiates on your behalf',
  },
  {
    icon: Wallet,
    title: 'Multi-chain Support',
    description: 'USDC on SKALE, Base, and other blockchain networks',
  },
]

export function FeaturesSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-card/30 border-t border-border/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-neon">Advanced Features</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the next generation of e-commerce with cutting-edge technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/50"
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
