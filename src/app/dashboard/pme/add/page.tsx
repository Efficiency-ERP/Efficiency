"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createOrganization, createContact } from "@/lib/supabase/contacts"
import { useContactsStore } from "@/contexts/contacts-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddPMEPage() {
  const router = useRouter()
  const { addOrganization, addContact } = useContactsStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
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
    if (!form.name) { alert("Name is required"); return }
    setLoading(true)
    try {
      const org = await createOrganization({
        name: form.name,
        mf: form.mf || null,
        unique_id: form.unique_id || null,
        address: { line1: form.address_line1, city: form.address_city, zipCode: form.address_zipCode, country: form.address_country },
        contact: { phone: form.phone, fax: form.fax || null },
        conditions_de_vente: form.conditions_de_vente || null,
      })
      const createdContact = await createContact({
        party_type: "both",
        is_internal_org: true,
        internal_organization_id: org.id,
        company_name: org.name,
        mf: null,
        unique_id: null,
        address: { line1: "", city: "", zipCode: "", country: "Tunisie" },
        contact: { phone: "+216 ", fax: null },
        conditions_de_vente: null,
        archived: false,
      })
      addOrganization(org)
      addContact(createdContact)
      router.push("/dashboard/contacts")
    } catch { alert("Failed to create PME") } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Add PME</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card><CardHeader><CardTitle>Basic Info</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>MF</Label><Input value={form.mf} onChange={(e) => setForm({ ...form, mf: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Unique ID</Label><Input value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} /></div>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Address</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Address</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2"><Label>City</Label><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Zip</Label><Input value={form.address_zipCode} onChange={(e) => setForm({ ...form, address_zipCode: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Country</Label><Input value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} /></div>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Fax</Label><Input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label>Conditions de Vente</Label><Input value={form.conditions_de_vente} onChange={(e) => setForm({ ...form, conditions_de_vente: e.target.value })} /></div>
        </CardContent></Card>
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save PME"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
