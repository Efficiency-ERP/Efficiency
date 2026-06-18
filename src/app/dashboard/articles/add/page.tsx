"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createArticle } from "@/lib/supabase/articles"
import { useArticlesStore } from "@/contexts/articles-store"
import { usePMESelection } from "@/contexts/pme-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Json } from "@/types/database"

export default function AddArticlePage() {
  const router = useRouter()
  const { selectedOrgId, selectedOrgName } = usePMESelection()
  const { addArticle } = useArticlesStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: "product" as "product" | "service",
    code: "",
    designation: "",
    unit: "",
    unit_price_puht: 0,
    transfer_price: 0,
    vat_rate: 19,
    dc_rate: 1,
    stock_onHand: 0,
    stock_minStock: 0,
    consignment_enabled: false,
  })
  const [packaging, setPackaging] = useState<Array<{ type: string; unitsPerArticle: number; depositValue: number }>>([])

  const addPackaging = () => setPackaging([...packaging, { type: "BOUTEILLE", unitsPerArticle: 12, depositValue: 1.5 }])
  const removePackaging = (i: number) => setPackaging(packaging.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.designation) { alert("Code and designation required"); return }
    if (form.type === "product" && !form.unit) { alert("Unit required for products"); return }
    if (form.consignment_enabled && packaging.length === 0) { alert("At least one packaging line required"); return }
    if (!selectedOrgId || selectedOrgId === "all") { alert("Please select a PME"); return }

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
        vat_rate: form.vat_rate,
        dc_rate: form.dc_rate,
        stock: { onHand: form.stock_onHand, minStock: form.stock_minStock },
        consignment: { enabled: form.consignment_enabled, packaging: validPackaging } as unknown as Json,
        active: true,
      })
      addArticle(created)
      router.push("/dashboard/articles")
    } catch (err) {
      console.error(err)
      alert("Failed to create article")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Add Article</h1>
      <div className="text-sm text-muted-foreground">PME: {selectedOrgName || "Select a PME first"}</div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
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
              <div className="grid gap-2"><Label>Designation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required /></div>
            </div>
            {form.type === "product" && (
              <div className="grid gap-2"><Label>Unit *</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>PUHT</Label><Input type="number" step="0.01" value={form.unit_price_puht} onChange={(e) => setForm({ ...form, unit_price_puht: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>Transfer Price</Label><Input type="number" step="0.01" value={form.transfer_price} onChange={(e) => setForm({ ...form, transfer_price: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>TVA %</Label><Input type="number" step="0.01" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} /></div>
              <div className="grid gap-2"><Label>DC %</Label><Input type="number" step="0.01" value={form.dc_rate} onChange={(e) => setForm({ ...form, dc_rate: Number(e.target.value) })} /></div>
            </div>
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
              {form.stock_onHand < form.stock_minStock && form.stock_minStock > 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">Low stock warning: on hand is below minimum</div>
              )}
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
                  <div className="grid gap-2"><Label>Type</Label><Input value={pkg.type} onChange={(e) => { const p = [...packaging]; p[i].type = e.target.value; setPackaging(p) }} placeholder="BOUTEILLE/PALETTE/CASIER" /></div>
                  <div className="grid gap-2"><Label>Units/Art</Label><Input type="number" value={pkg.unitsPerArticle} onChange={(e) => { const p = [...packaging]; p[i].unitsPerArticle = Number(e.target.value); setPackaging(p) }} /></div>
                  <div className="grid gap-2"><Label>Deposit</Label><Input type="number" step="0.01" value={pkg.depositValue} onChange={(e) => { const p = [...packaging]; p[i].depositValue = Number(e.target.value); setPackaging(p) }} /></div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removePackaging(i)}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addPackaging}>Add packaging line</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Article"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
