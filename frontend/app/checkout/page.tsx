'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, CreditCard, Wallet, CheckCircle } from 'lucide-react'

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review' | 'complete'>('shipping')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card')
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  })

  const subtotal = 38970
  const shipping = 0
  const total = subtotal + shipping

  const handleShippingSubmit = () => {
    if (shippingInfo.firstName && shippingInfo.address && shippingInfo.city) {
      setCurrentStep('payment')
    }
  }

  const handlePaymentSubmit = () => {
    setCurrentStep('review')
  }

  const handlePlaceOrder = () => {
    setCurrentStep('complete')
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 backdrop-blur-md bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-neon">
            <span className="text-2xl">🚀</span>
            <span>Cart Blanche</span>
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Steps */}
          <div className="flex justify-between mb-12">
            {(['shipping', 'payment', 'review', 'complete'] as const).map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : ['shipping', 'payment', 'review', 'complete'].indexOf(currentStep) > i
                      ? 'bg-primary/50 text-primary-foreground'
                      : 'bg-card border border-border/50 text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ['shipping', 'payment', 'review', 'complete'].indexOf(currentStep) > i
                        ? 'bg-primary'
                        : 'bg-border/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {currentStep === 'shipping' && (
                <Card className="border-border/50 bg-card/50 p-6">
                  <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          className="bg-input border-border/50"
                          value={shippingInfo.firstName}
                          onChange={(e) =>
                            setShippingInfo({ ...shippingInfo, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          className="bg-input border-border/50"
                          value={shippingInfo.lastName}
                          onChange={(e) =>
                            setShippingInfo({ ...shippingInfo, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className="bg-input border-border/50"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-sm font-medium mb-2 block">
                        Address
                      </Label>
                      <Input
                        id="address"
                        className="bg-input border-border/50"
                        value={shippingInfo.address}
                        onChange={(e) =>
                          setShippingInfo({ ...shippingInfo, address: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium mb-2 block">
                          City
                        </Label>
                        <Input
                          id="city"
                          className="bg-input border-border/50"
                          value={shippingInfo.city}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-sm font-medium mb-2 block">
                          State
                        </Label>
                        <Input
                          id="state"
                          className="bg-input border-border/50"
                          value={shippingInfo.state}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="zip" className="text-sm font-medium mb-2 block">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        className="bg-input border-border/50"
                        value={shippingInfo.zip}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zip: e.target.value })}
                      />
                    </div>

                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleShippingSubmit}
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </Card>
              )}

              {currentStep === 'payment' && (
                <Card className="border-border/50 bg-card/50 p-6">
                  <h2 className="text-2xl font-bold mb-6">Payment Method</h2>

                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'card' | 'wallet')}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="card" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="wallet" className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Web3 Wallet
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="card" className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Card Number</Label>
                        <Input
                          placeholder="4242 4242 4242 4242"
                          className="bg-input border-border/50 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Expiry</Label>
                          <Input placeholder="MM/YY" className="bg-input border-border/50 font-mono" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-2 block">CVV</Label>
                          <Input placeholder="123" className="bg-input border-border/50 font-mono" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="wallet" className="space-y-4">
                      <div className="p-6 border border-border/50 rounded-lg bg-card/50 text-center">
                        <Wallet className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <p className="font-semibold mb-2">Connect Your Web3 Wallet</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Pay with USDC on SKALE or Base network
                        </p>
                        <Button variant="outline" className="border-border/50 bg-transparent">
                          Connect Wallet
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-4 mt-6">
                    <Button
                      variant="outline"
                      className="flex-1 border-border/50 bg-transparent"
                      onClick={() => setCurrentStep('shipping')}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handlePaymentSubmit}
                    >
                      Review Order
                    </Button>
                  </div>
                </Card>
              )}

              {currentStep === 'review' && (
                <Card className="border-border/50 bg-card/50 p-6">
                  <h2 className="text-2xl font-bold mb-6">Review Order</h2>
                  <div className="space-y-4 mb-6">
                    {[
                      { name: 'Galactic Glide H-12M', qty: 1, price: 18990 },
                      { name: 'Astral Trek Attire NJ-2', qty: 2, price: 15990 },
                      { name: 'Cosmic Gloves Pro', qty: 1, price: 2990 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between pb-4 border-b border-border/30 last:border-b-0">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
                        </div>
                        <p className="font-semibold">${((item.price * item.qty) / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button
                      variant="outline"
                      className="flex-1 border-border/50 bg-transparent"
                      onClick={() => setCurrentStep('payment')}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handlePlaceOrder}
                    >
                      Place Order
                    </Button>
                  </div>
                </Card>
              )}

              {currentStep === 'complete' && (
                <Card className="border-border/50 bg-card/50 p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold mb-2">Order Confirmed!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your order has been successfully placed. Check your email for updates.
                  </p>
                  <div className="p-4 bg-card border border-border/50 rounded-lg mb-6">
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-2xl font-bold text-primary">GG-2026-001234</p>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link href="/shop">Continue Shopping</Link>
                  </Button>
                </Card>
              )}
            </div>

            {/* Order Summary */}
            <Card className="border-border/50 bg-card/50 p-6 h-fit sticky top-24">
              <h3 className="font-bold mb-6">Order Summary</h3>
              <div className="space-y-4 mb-6">
                {[
                  { name: 'Galactic Glide H-12M', price: 18990 },
                  { name: 'Astral Trek Attire NJ-2', price: 15990 },
                  { name: 'Cosmic Gloves Pro', price: 2990 },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>${(item.price / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-border/30 pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-primary pt-2">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
