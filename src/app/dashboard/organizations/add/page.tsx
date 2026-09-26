"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createOrganization } from "@/lib/supabase/contacts"
import { useContactsStore } from "@/contexts/contacts-store"
import { canAddOrganization, useUser } from "@/contexts/user-context"
import { useOrganizationSelection } from "@/contexts/organization-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActionLog } from "@/hooks/use-action-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddOrganizationPage() {
  const router = useRouter()
  const { organizations, addOrganization, addContact } = useContactsStore()
  const { tenants, loading: userLoading, addOrganization: addOrganizationToUser } = useUser()
  const { selectedOrgId } = useOrganizationSelection()
  const logAction = useActionLog("organizations")
  const [loading, setLoading] = useState(false)

  // A new organization joins one of the caller's groups, and only an admin may
  // add one. Someone with no group at all is onboarding: this creates the group.
  const adminTenants = tenants.filter((t) => t.role === "admin")
  const isOnboarding = tenants.length === 0
  const canAdd = canAddOrganization(tenants)

  // Default to the group of the organization currently selected, when the
  // caller administers it.
  const selectedTenantId = organizations.find((o) => o.id === selectedOrgId)?.tenant_id
  const defaultTenantId = adminTenants.find((t) => t.id === selectedTenantId)?.id ?? adminTenants[0]?.id ?? ""
  const [tenantId, setTenantId] = useState("")
  useEffect(() => {
    if (!tenantId && defaultTenantId) setTenantId(defaultTenantId)
  }, [tenantId, defaultTenantId])
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
    if (!form.name.trim()) { alert("Le nom est requis"); return }
    if (!isOnboarding && !tenantId) { alert("Sélectionner un groupe"); return }
    setLoading(true)
    try {
      // The database creates the organization and its internal contact together.
      const { organization, contact } = await createOrganization({
        name: form.name,
        mf: form.mf || null,
        unique_id: form.unique_id || null,
        address: { line1: form.address_line1, city: form.address_city, zipCode: form.address_zipCode, country: form.address_country },
        contact: { phone: form.phone, fax: form.fax || null },
        conditions_de_vente: form.conditions_de_vente || null,
      }, isOnboarding ? null : tenantId)
      addOrganization(organization)
      addContact(contact)
      addOrganizationToUser(
        organization,
        isOnboarding ? { id: organization.tenant_id, name: organization.name, role: "admin" } : undefined
      )
      await logAction(`Created organization ${organization.name}`, organization.id, organization.id)
      // Logo, bank details and the timbre fiscal are set on the edit screen.
      router.push(`/dashboard/organizations/${organization.id}/edit`)
    } catch (err) {
      console.error(err)
      const denied = (err as { code?: string })?.code === "42501"
      alert(denied ? "Seul un administrateur du groupe peut ajouter une organisation" : "Échec de la création de l'organisation")
    } finally { setLoading(false) }
  }

  if (userLoading) return <div className="text-muted-foreground">Chargement...</div>

  if (!canAdd) return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajouter une organisation</h1>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Seul un administrateur du groupe peut ajouter une organisation.
          </p>
          <Button variant="outline" onClick={() => router.back()}>Retour</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajouter une organisation</h1>
      {isOnboarding ? (
        <p className="text-sm text-muted-foreground">
          Votre première organisation : elle crée votre groupe, dont vous serez l&apos;administrateur.
        </p>
      ) : adminTenants.length === 1 ? (
        <p className="text-sm text-muted-foreground">
          Elle rejoindra le groupe <span className="font-medium text-foreground">{adminTenants[0].name}</span>.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isOnboarding && adminTenants.length > 1 && (
          <Card><CardHeader><CardTitle>Groupe</CardTitle></CardHeader><CardContent className="space-y-2">
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un groupe" /></SelectTrigger>
              <SelectContent>
                {adminTenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les organisations d&apos;un même groupe partagent leurs contacts et peuvent facturer entre elles.
            </p>
          </CardContent></Card>
        )}
        <Card><CardHeader><CardTitle>Informations générales</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>MF</Label><Input value={form.mf} onChange={(e) => setForm({ ...form, mf: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Identifiant unique</Label><Input value={form.unique_id} onChange={(e) => setForm({ ...form, unique_id: e.target.value })} /></div>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Adresse</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Adresse</Label><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2"><Label>Ville</Label><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>CP</Label><Input value={form.address_zipCode} onChange={(e) => setForm({ ...form, address_zipCode: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Pays</Label><Input value={form.address_country} onChange={(e) => setForm({ ...form, address_country: e.target.value })} /></div>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Fax</Label><Input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label>Conditions de Vente</Label><Input value={form.conditions_de_vente} onChange={(e) => setForm({ ...form, conditions_de_vente: e.target.value })} /></div>
        </CardContent></Card>
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer l'organisation"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  )
}
