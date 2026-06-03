"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createContact } from "@/lib/supabase/contacts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddContactPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: "",
    party_type: "customer" as "customer" | "supplier" | "both",
    mf: "",
    unique_id: "",
    address_line1: "",
    address_city: "",
    address_zipCode: "",
    address_country: "Tunisie",
    phone: "+216 ",
    fax: "",
    conditions_de_vente: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name) {
      alert("Company name is required")
      return
    }
    setLoading(true)
    try {
      await createContact({
        party_type: form.party_type,
        is_internal_org: false,
        internal_organization_id: null,
        company_name: form.company_name,
        mf: form.mf || null,
        unique_id: form.unique_id || null,
        address: {
          line1: form.address_line1,
          city: form.address_city,
          zipCode: form.address_zipCode,
          country: form.address_country,
        },
        contact: {
          phone: form.phone,
          fax: form.fax || null,
        },
        conditions_de_vente: form.conditions_de_vente || null,
        archived: false,
      })
      router.push("/dashboard/contacts")
    } catch (err) {
      console.error(err)
      alert("Failed to create contact")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Add Contact</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label>Party Type *</Label>
              <Select value={form.party_type} onValueChange={(v) => setForm({ ...form, party_type: v as typeof form.party_type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mf">MF</Label>
                <Input id="mf" value={form.mf} onChange={(e) => setForm({ ...form, mf: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unique_id">Unique ID</Label>
                <Input id="unique_id" value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="address_line1">Address</Label>
              <Input id="address_line1" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="address_city">City</Label>
                <Input id="address_city" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_zipCode">Zip Code</Label>
                <Input id="address_zipCode" value={form.address_zipCode} onChange={(e) => setForm({ ...form, address_zipCode: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_country">Country</Label>
                <Input id="address_country" value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conditions_de_vente">Conditions de Vente</Label>
              <Input id="conditions_de_vente" value={form.conditions_de_vente} onChange={(e) => setForm({ ...form, conditions_de_vente: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Contact"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
