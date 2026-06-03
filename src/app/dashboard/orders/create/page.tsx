"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { useArticlesStore } from "@/contexts/articles-store"
import { createOrder, generateOrderNumber } from "@/lib/supabase/invoices"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreateOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderType = (searchParams.get("type") || "supplier") as "supplier" | "customer"
  const { selectedOrgId } = usePMESelection()
  const { contacts } = useContactsStore()
  const { articles } = useArticlesStore()
  const [counterpartyId, setCounterpartyId] = useState("")
  const [orderNumber] = useState(generateOrderNumber())
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<Array<{ code: string; designation: string; unit: string | null; quantity: number; unit_price: number | null }>>([])
  const [loading, setLoading] = useState(false)

  const addFromArticle = (articleId: string) => {
    const article = articles.find((a) => a.id === articleId)
    if (!article) return
    setLines([...lines, { code: article.code, designation: article.designation, unit: article.unit, quantity: 1, unit_price: article.unit_price_puht }])
  }
  const addFreeformLine = () => setLines([...lines, { code: "", designation: "", unit: null, quantity: 1, unit_price: null }])
  const updateLine = (i: number, patch: Partial<typeof lines[0]>) => { const u = [...lines]; u[i] = { ...u[i], ...patch }; setLines(u) }
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrgId || selectedOrgId === "all") { alert("Select a PME"); return }
    if (!counterpartyId) { alert("Select a counterparty"); return }
    if (lines.length === 0) { alert("Add at least one line"); return }
    setLoading(true)
    try {
      await createOrder({ number: orderNumber, date, organization_id: selectedOrgId, counterparty_id: counterpartyId, type: orderType, status: "draft" }, lines)
      router.push("/dashboard/orders")
    } catch { alert("Failed to create order") } finally { setLoading(false) }
  }

  const filteredContacts = contacts.filter((c) => orderType === "supplier" ? c.party_type !== "customer" : c.party_type !== "supplier")

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Create Order (BC) — {orderType}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Counterparty *</Label><Select value={counterpartyId} onValueChange={setCounterpartyId}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent>{filteredContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Number</Label><Input value={orderNumber} readOnly /></div>
              <div className="grid gap-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Lines</CardTitle><div className="flex gap-2"><Select onValueChange={addFromArticle}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Add from article" /></SelectTrigger><SelectContent>{articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={addFreeformLine}>Freeform</Button></div></CardHeader>
          <CardContent>
            {lines.length === 0 ? <div className="text-center py-8 text-muted-foreground">No lines</div> : (
              <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Code</th><th className="text-left p-2">Designation</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Unit</th><th className="text-right p-2">Price</th><th></th></tr></thead>
                <tbody>{lines.map((line, i) => (<tr key={i} className="border-b"><td className="p-1"><Input value={line.code} onChange={(e) => updateLine(i, { code: e.target.value })} className="h-8" /></td><td className="p-1"><Input value={line.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} className="h-8" /></td><td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-20 text-right" /></td><td className="p-1"><Input value={line.unit || ""} onChange={(e) => updateLine(i, { unit: e.target.value || null })} className="h-8 w-20" /></td><td className="p-1"><Input type="number" step="0.01" value={line.unit_price || 0} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} className="h-8 w-24 text-right" /></td><td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>X</Button></td></tr>))}</tbody></table>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-4"><Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Order"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
      </form>
    </div>
  )
}
