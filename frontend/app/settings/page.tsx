'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  User,
  Lock,
  Bell,
  MapPin,
  Shield,
  CreditCard,
  Save,
  LogOut,
  ChevronRight,
} from 'lucide-react'

export default function SettingsPage() {
  const [profileData, setProfileData] = useState({
    firstName: 'Alex',
    lastName: 'Nova',
    email: 'alex.nova@spacegate.com',
    phone: '+1 (555) 123-4567',
  })

  const [shippingAddresses, setShippingAddresses] = useState([
    {
      id: 1,
      label: 'Home',
      address: '123 Galactic Way',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      default: true,
    },
    {
      id: 2,
      label: 'Work',
      address: '456 Nebula Boulevard',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      default: false,
    },
  ])

  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    mandateReminders: true,
    promotions: false,
    weeklyDigest: true,
    securityAlerts: true,
  })

  const [agentMetadata, setAgentMetadata] = useState({
    agentId: '0x1a2b3c4d5e6f7g8h9i',
    businessName: 'Alex Nova Shopping Agent',
    reputation: 4.8,
    totalTransactions: 47,
  })

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field: string) => {
    setNotifications((prev) => ({ ...prev, [field]: !prev[field] }))
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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </nav>

      <div className="pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-12">
            <span className="text-neon">Settings & Profile</span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'shipping', label: 'Shipping', icon: MapPin },
                  { id: 'security', label: 'Security', icon: Lock },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'agent', label: 'Agent Identity', icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-card/50 transition text-muted-foreground hover:text-foreground"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Profile Settings */}
              <Card className="border-border/50 bg-card/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">Profile</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-border/30">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                      🚀
                    </div>
                    <div>
                      <p className="font-bold">{profileData.firstName} {profileData.lastName}</p>
                      <p className="text-sm text-muted-foreground">{profileData.email}</p>
                      <Button size="sm" variant="outline" className="mt-2 border-border/50 bg-transparent">
                        Change Avatar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                        className="bg-input border-border/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                        className="bg-input border-border/50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className="bg-input border-border/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium mb-2 block">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      className="bg-input border-border/50"
                    />
                  </div>

                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </Card>

              {/* Shipping Addresses */}
              <Card className="border-border/50 bg-card/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-bold">Shipping Addresses</h2>
                  </div>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    + Add Address
                  </Button>
                </div>

                <div className="space-y-4">
                  {shippingAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold">{addr.label}</p>
                          {addr.default && (
                            <p className="text-xs text-primary font-semibold">Default Address</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {addr.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {addr.city}, {addr.state} {addr.zip}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Notifications */}
              <Card className="border-border/50 bg-card/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">Notification Preferences</h2>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: 'orderUpdates',
                      label: 'Order Updates',
                      description: 'Receive notifications when your orders are processed',
                    },
                    {
                      key: 'mandateReminders',
                      label: 'Mandate Reminders',
                      description: 'Get reminders when mandates are about to expire',
                    },
                    {
                      key: 'promotions',
                      label: 'Promotions & Offers',
                      description: 'Receive exclusive deals and promotional offers',
                    },
                    {
                      key: 'weeklyDigest',
                      label: 'Weekly Digest',
                      description: 'Get a summary of your shopping activity',
                    },
                    {
                      key: 'securityAlerts',
                      label: 'Security Alerts',
                      description: 'Important notifications about account security',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 border border-border/30 rounded-lg hover:border-border/50 transition"
                    >
                      <div>
                        <p className="font-semibold text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Checkbox
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={() => handleNotificationChange(item.key)}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Security */}
              <Card className="border-border/50 bg-card/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">Security</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Password</p>
                        <p className="text-xs text-muted-foreground">
                          Last changed 3 months ago
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
                        Change Password
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">
                          Secure your account with 2FA
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-border/50 rounded-lg hover:border-primary/50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Connected Wallets</p>
                        <p className="text-xs text-muted-foreground">
                          Manage your Web3 wallet connections
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="border-border/50 bg-transparent">
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Agent Identity */}
              <Card className="border-border/50 bg-card/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">Agent Identity (ERC-8004)</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Agent ID (NFT Contract Address)</p>
                    <p className="font-mono text-sm break-all">{agentMetadata.agentId}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Business Name</p>
                      <p className="font-semibold text-sm">{agentMetadata.businessName}</p>
                    </div>
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Reputation</p>
                      <p className="font-semibold text-sm text-primary">{agentMetadata.reputation}</p>
                    </div>
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Total Transactions</p>
                      <p className="font-semibold text-sm">{agentMetadata.totalTransactions}</p>
                    </div>
                    <div className="p-4 border border-border/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Status</p>
                      <p className="font-semibold text-sm text-green-400">Verified</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 border-border/50 bg-transparent">
                      View on Chain
                    </Button>
                    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      Edit Metadata
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50 bg-destructive/5 p-6">
                <h2 className="text-lg font-bold text-destructive mb-4">Danger Zone</h2>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
                  >
                    Delete Account
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
