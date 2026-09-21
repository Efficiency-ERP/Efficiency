"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useContactsStore } from "@/contexts/contacts-store"
import {
  deleteOrganizationLogo,
  getOrganizationLogoUrl,
  updateOrganization,
  uploadOrganizationLogo,
} from "@/lib/supabase/contacts"
import { useActionLog } from "@/hooks/use-action-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { castJson } from "@/lib/utils"
import type { Address, BankDetails, ContactInfo } from "@/types/database"

const MAX_LOGO_BYTES = 2 * 1024 * 1024

export default function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { organizations, loading, updateOrganization: updateInStore } = useContactsStore()
  const organization = organizations.find((o) => o.id === id)
  const logAction = useActionLog("pme")

  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState({
    name: "",
    mf: "",
    unique_id: "",
    address_line1: "",
    address_city: "",
    address_zipCode: "",
    address_country: "Tunisie",
    phone: "",
    fax: "",
    conditions_de_vente: "",
    bank_name: "",
    rib: "",
    iban: "",
    swift: "",
  })

  useEffect(() => {
    if (!organization) return
    const address = castJson<Address>(organization.address)
    const contactInfo = castJson<ContactInfo>(organization.contact)
    const bank = castJson<BankDetails>(organization.bank_details) || {}
    setForm({
      name: organization.name,
      mf: organization.mf || "",
      unique_id: organization.unique_id || "",
      address_line1: address?.line1 || "",
      address_city: address?.city || "",
      address_zipCode: address?.zipCode || "",
      address_country: address?.country || "Tunisie",
      phone: contactInfo?.phone || "",
      fax: contactInfo?.fax || "",
      conditions_de_vente: organization.conditions_de_vente || "",
      bank_name: bank.bank_name || "",
      rib: bank.rib || "",
      iban: bank.iban || "",
      swift: bank.swift || "",
    })
    setLogoPath(organization.logo_path)
  }, [organization])

  // The bucket is private, so previewing the logo needs a short-lived signed URL.
  useEffect(() => {
    let cancelled = false
    if (!logoPath) {
      setLogoUrl(null)
      return
    }
    getOrganizationLogoUrl(logoPath)
      .then((url) => {
        if (!cancelled) setLogoUrl(url)
      })
      .catch((err) => {
        console.error("Failed to load logo:", err)
        if (!cancelled) setLogoUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [logoPath])

  if (loading) return <div className="text-muted-foreground">Loading...</div>
  if (!organization) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Organisation introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/pme")}>Back to PME</Button>
    </div>
  )

  const handleLogoChange = async (file: File) => {
    if (file.size > MAX_LOGO_BYTES) {
      alert("Le logo ne doit pas dépasser 2 Mo")
      return
    }
    setUploadingLogo(true)
    try {
      const previous = logoPath
      const path = await uploadOrganizationLogo(file, id)
      await updateOrganization(id, { logo_path: path })
      updateInStore(id, { logo_path: path })
      setLogoPath(path)
      // Only bin the old file once the new one is safely referenced.
      if (previous) await deleteOrganizationLogo(previous).catch((err) => console.error(err))
    } catch (err) {
      console.error(err)
      alert("Échec du téléversement du logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!logoPath) return
    setUploadingLogo(true)
    try {
      await updateOrganization(id, { logo_path: null })
      updateInStore(id, { logo_path: null })
      await deleteOrganizationLogo(logoPath).catch((err) => console.error(err))
      setLogoPath(null)
    } catch (err) {
      console.error(err)
      alert("Échec de la suppression du logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      alert("Name is required")
      return
    }
    setSaving(true)
    try {
      // Left as a fresh object literal rather than annotated BankDetails so it
      // stays assignable to the column's Json type.
      const bankDetails = {
        bank_name: form.bank_name || null,
        rib: form.rib || null,
        iban: form.iban || null,
        swift: form.swift || null,
      }
      const hasBankDetails = Object.values(bankDetails).some(Boolean)

      const patch = {
        name: form.name,
        mf: form.mf || null,
        unique_id: form.unique_id || null,
        address: {
          line1: form.address_line1,
          city: form.address_city,
          zipCode: form.address_zipCode,
          country: form.address_country,
        },
        contact: { phone: form.phone, fax: form.fax || null },
        conditions_de_vente: form.conditions_de_vente || null,
        bank_details: hasBankDetails ? bankDetails : null,
      }

      const updated = await updateOrganization(id, patch)
      updateInStore(id, updated)
      await logAction(`Updated PME ${updated.name}`, updated.id, updated.id)
      router.push("/dashboard/pme")
    } catch (err) {
      console.error(err)
      alert("Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit PME</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>MF</Label><Input value={form.mf} onChange={(e) => setForm({ ...form, mf: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Unique ID</Label><Input value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Affiché en en-tête de chaque document imprimé. PNG ou JPG, 2 Mo maximum.
            </p>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-16 w-auto border rounded bg-white object-contain p-1" />
            ) : (
              <div className="text-sm text-muted-foreground">Aucun logo</div>
            )}
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploadingLogo}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoChange(file)
                  e.target.value = ""
                }}
                className="max-w-xs"
              />
              {logoPath && (
                <Button type="button" variant="outline" disabled={uploadingLogo} onClick={handleRemoveLogo}>
                  Supprimer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label>Address</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>City</Label><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Zip</Label><Input value={form.address_zipCode} onChange={(e) => setForm({ ...form, address_zipCode: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Country</Label><Input value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Fax</Label><Input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Conditions de Vente</Label><Input value={form.conditions_de_vente} onChange={(e) => setForm({ ...form, conditions_de_vente: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Coordonnées bancaires</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Imprimées sur les factures pour le paiement par virement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Banque</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>RIB</Label><Input value={form.rib} onChange={(e) => setForm({ ...form, rib: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
              <div className="grid gap-2"><Label>SWIFT / BIC</Label><Input value={form.swift} onChange={(e) => setForm({ ...form, swift: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
