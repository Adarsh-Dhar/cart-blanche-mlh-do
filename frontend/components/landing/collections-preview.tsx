'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const collections = [
  {
    id: 'suits',
    name: 'Space Suits',
    price: '$18,990',
    image: '👨‍🚀',
    color: 'from-primary/40 to-primary/10',
  },
  {
    id: 'helmets',
    name: 'Helmets & Gear',
    price: '$4,990',
    image: '🪐',
    color: 'from-secondary/40 to-secondary/10',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    price: '$1,290',
    image: '⭐',
    color: 'from-accent/40 to-accent/10',
  },
]

export function CollectionsPreview() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-neon">Featured Collections</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Explore our carefully curated selection of space-inspired fashion and gear
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2 bg-transparent">
            <Link href="/shop">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/shop?collection=${collection.id}`}>
              <Card className="group relative overflow-hidden h-80 border-border/50 bg-card/50 hover:bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 cursor-pointer">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${collection.color} pointer-events-none`} />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-6">
                  <div>
                    <div className="text-6xl mb-4">{collection.image}</div>
                    <h3 className="text-2xl font-bold mb-2">{collection.name}</h3>
                    <p className="text-primary font-semibold">{collection.price}</p>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all">
                    <span className="text-sm font-medium">Shop Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
