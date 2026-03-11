"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function VendorDetailPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const [vendor, setVendor] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", logoUrl: "", pubkey: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch vendor details
  useEffect(() => {
    async function fetchVendor() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/vendors/${params.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch vendor")
        setVendor(data.data)
        setForm({
          name: data.data.name || "",
          description: data.data.description || "",
          logoUrl: data.data.logoUrl || "",
          pubkey: data.data.pubkey || ""
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchVendor()
  }, [params.id])

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Update vendor
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/vendors/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update vendor")
      setVendor(data.data)
      setEditMode(false)
      setSuccess("Vendor updated successfully!")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete vendor
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this vendor? This cannot be undone.")) return
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/vendors/${params.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || "Failed to delete vendor")
      setSuccess("Vendor deleted successfully!")
      setTimeout(() => router.push("/vendors"), 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="max-w-xl mx-auto py-16 px-4">Loading...</div>
  if (error) return <div className="max-w-xl mx-auto py-16 px-4 text-red-500">{error}</div>
  if (!vendor) return <div className="max-w-xl mx-auto py-16 px-4">Vendor not found.</div>

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card className="p-8 bg-card/50 border border-border/50 shadow-lg">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold mb-1 tracking-tight">Vendor Details</h1>
            <p className="text-muted-foreground text-sm">Manage your UCP-compliant vendor profile.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode((v) => !v)} disabled={deleting}>
              {editMode ? "Cancel" : "Edit"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/vendors/${params.id}/shop?vendorId=${params.id}`)}>
              All Products
            </Button>
          </div>
        </div>
        {success && <div className="text-green-600 text-sm mb-4">{success}</div>}
        {editMode ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Vendor Name *</label>
              <Input name="name" value={form.name} onChange={handleChange} required disabled={loading} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Description</label>
              <Textarea name="description" value={form.description} onChange={handleChange} rows={3} disabled={loading} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Logo URL</label>
              <Input name="logoUrl" value={form.logoUrl} onChange={handleChange} disabled={loading} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Public Key *</label>
              <Input name="pubkey" value={form.pubkey} onChange={handleChange} required disabled={loading} />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              {vendor.logoUrl && (
                <img src={vendor.logoUrl} alt={vendor.name} className="w-16 h-16 rounded-xl object-cover border border-border/30 bg-muted" />
              )}
              <div>
                <div className="text-xl font-bold group-hover:text-primary transition-colors">{vendor.name}</div>
                <div className="text-xs font-mono opacity-70 mt-1">{vendor.pubkey.slice(0, 6)}...{vendor.pubkey.slice(-4)}</div>
              </div>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground mb-1">Description</span>
              <span>{vendor.description || <span className="text-muted-foreground">No description</span>}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="text-xs text-muted-foreground">Products: <span className="font-bold">{vendor._count?.products ?? 0}</span></div>
              <div className="text-xs text-muted-foreground">Orders: <span className="font-bold">{vendor._count?.orders ?? 0}</span></div>
            </div>
          </div>
        )}
        <Button variant="destructive" className="w-full mt-10" onClick={handleDelete} disabled={deleting || loading}>
          {deleting ? "Deleting..." : "Delete Vendor"}
        </Button>
      </Card>
    </div>
  )
}
