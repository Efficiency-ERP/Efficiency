"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useContactsStore } from "@/contexts/contacts-store"
import { updateContact } from "@/lib/supabase/contacts"
import { useActionLog } from "@/hooks/use-action-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { castJson } from "@/lib/utils"
import { PartyTypeField } from "@/components/party-type-field"
import type { Address, ContactInfo } from "@/types/database"

export default function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts, loading, updateContact: updateContactInStore } = useContactsStore()
  const contact = contacts.find((c) => c.id === id)
  const logAction = useActionLog("contacts")

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: "",
    party_type: "customer",
    mf: "",
    unique_id: "",
    address_line1: "",
    address_city: "",
    address_zipCode: "",
    address_country: "Tunisie",
    phone: "",
    fax: "",
    conditions_de_vente: "",
  })

  useEffect(() => {
    if (contact) {
      const address = castJson<Address>(contact.address)
      const contactInfo = castJson<ContactInfo>(contact.contact)
      setForm({
        company_name: contact.company_name,
        party_type: contact.party_type,
        mf: contact.mf || "",
        unique_id: contact.unique_id || "",
        address_line1: address.line1 || "",
        address_city: address.city || "",
        address_zipCode: address.zipCode || "",
        address_country: address.country || "Tunisie",
        phone: contactInfo.phone || "",
        fax: contactInfo.fax || "",
        conditions_de_vente: contact.conditions_de_vente || "",
      })
    }
  }, [contact])

  if (loading) return <div className="text-muted-foreground">Chargement...</div>
  if (!contact) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Contact introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/contacts")}>Retour aux contacts</Button>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.party_type) {
      alert("Le type de tiers est requis")
      return
    }
    setSaving(true)
    try {
      const updated = await updateContact(id, {
        company_name: form.company_name,
        party_type: form.party_type,
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
      })
      updateContactInStore(id, updated)
      await logAction(`Updated contact ${updated.company_name}`, updated.id)
      router.push("/dashboard/contacts")
    } catch (err) {
      console.error(err)
      alert("Échec de la mise à jour du contact")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Modifier le contact</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Raison sociale *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label>Type de tiers *</Label>
              <PartyTypeField value={form.party_type} onChange={(v) => setForm({ ...form, party_type: v })} contacts={contacts} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>MF</Label><Input value={form.mf} onChange={(e) => setForm({ ...form, mf: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Identifiant unique</Label><Input value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label>Adresse</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Ville</Label><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Code postal</Label><Input value={form.address_zipCode} onChange={(e) => setForm({ ...form, address_zipCode: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Pays</Label><Input value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Fax</Label><Input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Conditions de Vente</Label><Input value={form.conditions_de_vente} onChange={(e) => setForm({ ...form, conditions_de_vente: e.target.value })} /></div>
          </CardContent>
        </Card>
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer les modifications"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  )
}
