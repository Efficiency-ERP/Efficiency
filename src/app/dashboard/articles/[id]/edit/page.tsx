"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useArticlesStore } from "@/contexts/articles-store"
import { updateArticle } from "@/lib/supabase/articles"
import { useActionLog } from "@/hooks/use-action-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaxChargesEditor, defaultTaxCharges } from "@/components/tax-charges-editor"
import { castJson } from "@/lib/utils"
import type { Stock, Consignment, Json, TaxCharge } from "@/types/database"

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { articles, loading, updateArticle: updateArticleInStore } = useArticlesStore()
  const article = articles.find((a) => a.id === id)
  const logAction = useActionLog("articles")

  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (article) {
      const stock = article.stock as unknown as Stock
      const consignment = article.consignment as unknown as Consignment
      setForm({
        type: article.type,
        code: article.code,
        designation: article.designation,
        unit: article.unit || "",
        unit_price_puht: article.unit_price_puht,
        transfer_price: article.transfer_price,
        stock_onHand: stock.onHand,
        stock_minStock: stock.minStock,
        consignment_enabled: consignment.enabled,
      })
      const charges = castJson<TaxCharge[]>(article.tax_charges)
      setTaxCharges(charges.length > 0 ? charges : defaultTaxCharges())
      setPackaging(consignment.packaging.map((p) => ({ type: p.type, unitsPerArticle: p.unitsPerArticle, depositValue: p.depositValue })))
    }
  }, [article])

  if (loading) return <div className="text-muted-foreground">Loading...</div>
  if (!article) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Article introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/articles")}>Back to articles</Button>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const validPackaging = packaging.filter((p) => ["BOUTEILLE", "PALETTE", "CASIER"].includes(p.type.toUpperCase()))
      const updated = await updateArticle(id, {
        code: form.code,
        designation: form.designation,
        unit: form.unit || null,
        unit_price_puht: form.unit_price_puht,
        transfer_price: form.transfer_price,
        tax_charges: taxCharges as unknown as Json,
        stock: { onHand: form.stock_onHand, minStock: form.stock_minStock },
        consignment: { enabled: form.consignment_enabled, packaging: validPackaging } as unknown as Json,
      })
      updateArticleInStore(id, updated)
      await logAction(`Updated article ${updated.code} — ${updated.designation}`, updated.id, updated.organization_id)
      router.push(`/dashboard/articles/${id}`)
    } catch (err) {
      console.error(err)
      alert("Failed to update article")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Article</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Produit</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
              <div className="grid gap-2"><Label>Designation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required /></div>
            </div>
            {form.type === "product" && <div className="grid gap-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>PUHT</Label><Input type="number" step="0.01" value={form.unit_price_puht} onChange={(e) => setForm({ ...form, unit_price_puht: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>Transfer Price</Label><Input type="number" step="0.01" value={form.transfer_price} onChange={(e) => setForm({ ...form, transfer_price: Number(e.target.value) })} /></div>
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
                <div className="grid gap-2"><Label>On Hand</Label><Input type="number" value={form.stock_onHand} onChange={(e) => setForm({ ...form, stock_onHand: Number(e.target.value) })} /></div>
                <div className="grid gap-2"><Label>Min Stock</Label><Input type="number" value={form.stock_minStock} onChange={(e) => setForm({ ...form, stock_minStock: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="consignment" checked={form.consignment_enabled} onChange={(e) => setForm({ ...form, consignment_enabled: e.target.checked })} />
                <Label htmlFor="consignment">Enable Consignment</Label>
              </div>
            </CardContent>
          </Card>
        )}
        {form.type === "product" && form.consignment_enabled && (
          <Card>
            <CardHeader><CardTitle>Packaging</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {packaging.map((pkg, i) => (
                <div key={i} className="flex gap-4 items-end">
                  <div className="grid gap-2"><Label>Type</Label><Input value={pkg.type} onChange={(e) => { const p = [...packaging]; p[i].type = e.target.value; setPackaging(p) }} /></div>
                  <div className="grid gap-2"><Label>Units/Art</Label><Input type="number" value={pkg.unitsPerArticle} onChange={(e) => { const p = [...packaging]; p[i].unitsPerArticle = Number(e.target.value); setPackaging(p) }} /></div>
                  <div className="grid gap-2"><Label>Deposit</Label><Input type="number" step="0.01" value={pkg.depositValue} onChange={(e) => { const p = [...packaging]; p[i].depositValue = Number(e.target.value); setPackaging(p) }} /></div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setPackaging(packaging.filter((_, idx) => idx !== i))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setPackaging([...packaging, { type: "BOUTEILLE", unitsPerArticle: 12, depositValue: 1.5 }])}>Add packaging line</Button>
            </CardContent>
          </Card>
        )}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
