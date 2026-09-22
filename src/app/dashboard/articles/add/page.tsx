"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createArticle } from "@/lib/supabase/articles"
import { useArticlesStore } from "@/contexts/articles-store"
import { useOrganizationSelection } from "@/contexts/organization-context"
import { useActionLog } from "@/hooks/use-action-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaxChargesEditor, defaultTaxCharges } from "@/components/tax-charges-editor"
import type { Json, TaxCharge } from "@/types/database"

export default function AddArticlePage() {
  const router = useRouter()
  const { selectedOrgId, selectedOrgName } = useOrganizationSelection()
  const { addArticle } = useArticlesStore()
  const logAction = useActionLog("articles")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: "product" as "product" | "service",
    code: "",
    designation: "",
    unit: "",
    unit_price_puht: 0,
    transfer_price: 0,
    stock_onHand: 0,
    stock_minStock: 0,
    consignment_enabled: false,
  })
  const [taxCharges, setTaxCharges] = useState<TaxCharge[]>(defaultTaxCharges())
  const [packaging, setPackaging] = useState<Array<{ type: string; unitsPerArticle: number; depositValue: number }>>([])

  const addPackaging = () => setPackaging([...packaging, { type: "BOUTEILLE", unitsPerArticle: 12, depositValue: 1.5 }])
  const removePackaging = (i: number) => setPackaging(packaging.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.designation) { alert("Code et désignation requis"); return }
    if (form.type === "product" && !form.unit) { alert("Unité requise pour les produits"); return }
    if (form.consignment_enabled && packaging.length === 0) { alert("Au moins une ligne d'emballage est requise"); return }
    if (!selectedOrgId || selectedOrgId === "all") { alert("Veuillez sélectionner une organisation"); return }

    setLoading(true)
    try {
      const validPackaging = packaging.filter((p) => ["BOUTEILLE", "PALETTE", "CASIER"].includes(p.type.toUpperCase()))
      const created = await createArticle({
        type: form.type,
        code: form.code,
        designation: form.designation,
        organization_id: selectedOrgId,
        unit: form.unit || null,
        unit_price_puht: form.unit_price_puht,
        transfer_price: form.transfer_price,
        tax_charges: taxCharges as unknown as Json,
        stock: { onHand: form.stock_onHand, minStock: form.stock_minStock },
        consignment: { enabled: form.consignment_enabled, packaging: validPackaging } as unknown as Json,
        active: true,
      })
      addArticle(created)
      await logAction(`Created article ${created.code} — ${created.designation}`, created.id, created.organization_id)
      router.push("/dashboard/articles")
    } catch (err) {
      console.error(err)
      alert("Échec de la création de l'article")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Ajouter un article</h1>
      <div className="text-sm text-muted-foreground">Organisation : {selectedOrgName || "Sélectionnez d'abord une organisation"}</div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produit</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
              <div className="grid gap-2"><Label>Désignation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required /></div>
            </div>
            {form.type === "product" && (
              <div className="grid gap-2"><Label>Unité *</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tarification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>PUHT</Label><Input type="number" step="0.01" value={form.unit_price_puht} onChange={(e) => setForm({ ...form, unit_price_puht: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>Prix de transfert</Label><Input type="number" step="0.01" value={form.transfer_price} onChange={(e) => setForm({ ...form, transfer_price: Number(e.target.value) })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Taxes</CardTitle></CardHeader>
          <CardContent>
            <TaxChargesEditor charges={taxCharges} onChange={setTaxCharges} />
          </CardContent>
        </Card>

        {form.type === "product" && (
          <Card>
            <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>En stock</Label><Input type="number" value={form.stock_onHand} onChange={(e) => setForm({ ...form, stock_onHand: Number(e.target.value) })} /></div>
                <div className="grid gap-2"><Label>Stock min</Label><Input type="number" value={form.stock_minStock} onChange={(e) => setForm({ ...form, stock_minStock: Number(e.target.value) })} /></div>
              </div>
              {form.stock_onHand < form.stock_minStock && form.stock_minStock > 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">Alerte stock bas : la quantité en stock est inférieure au minimum</div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="consignment" checked={form.consignment_enabled} onChange={(e) => setForm({ ...form, consignment_enabled: e.target.checked })} />
                <Label htmlFor="consignment">Activer la consignation</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {form.type === "product" && form.consignment_enabled && (
          <Card>
            <CardHeader><CardTitle>Emballage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {packaging.map((pkg, i) => (
                <div key={i} className="flex gap-4 items-end">
                  <div className="grid gap-2"><Label>Type</Label><Input value={pkg.type} onChange={(e) => { const p = [...packaging]; p[i].type = e.target.value; setPackaging(p) }} placeholder="BOUTEILLE/PALETTE/CASIER" /></div>
                  <div className="grid gap-2"><Label>Unités/Art</Label><Input type="number" value={pkg.unitsPerArticle} onChange={(e) => { const p = [...packaging]; p[i].unitsPerArticle = Number(e.target.value); setPackaging(p) }} /></div>
                  <div className="grid gap-2"><Label>Consigne</Label><Input type="number" step="0.01" value={pkg.depositValue} onChange={(e) => { const p = [...packaging]; p[i].depositValue = Number(e.target.value); setPackaging(p) }} /></div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removePackaging(i)}>Supprimer</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addPackaging}>Ajouter un emballage</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer l'article"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </div>
  )
}
