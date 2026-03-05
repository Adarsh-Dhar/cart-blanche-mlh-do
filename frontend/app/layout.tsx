import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'


import './globals.css'
import Header from "@/components/header"

const geist = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cart Blanche | AI Shopping Concierge',
  description: 'Futuristic space-themed shopping with AI-powered commerce. Discover exclusive space gear and fashion.',
  keywords: 'shopping, AI, space, fashion, gear, e-commerce',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#141418',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            color-scheme: dark;
          }
        `}</style>
      </head>
      {/* Added min-h-screen and flex to ensure the layout stretches properly */}
      <body className={`${geist.className} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <Header /> {/* Place the Header here */}
        {/* Wrap children in a main tag that flexes to fill the rest of the screen */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
