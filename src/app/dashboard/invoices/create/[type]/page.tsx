"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { useArticlesStore } from "@/contexts/articles-store"
import { createInvoice, generateInvoiceNumber, computeInvoiceTotals } from "@/lib/supabase/invoices"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PAYMENT_METHODS } from "@/lib/utils"
import type { Json, PaymentMethod } from "@/types/database"

export default function CreateInvoiceFormPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts, organizations } = useContactsStore()
  const { articles } = useArticlesStore()

  const [organizationId, setOrganizationId] = useState(selectedOrgId !== "all" ? selectedOrgId : "")
  const [counterpartyId, setCounterpartyId] = useState("")
  const [invoiceNumber] = useState(generateInvoiceNumber())
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<Array<{ code: string; designation: string; unit: string | null; quantity: number; unit_price_puht: number; vat_rate: number; dc_rate: number; article_id: string | null }>>([])
  const [loading, setLoading] = useState(false)

  const invoiceType = type as "standard" | "credit" | "debit"

  const addFromArticle = (articleId: string) => {
    const article = articles.find((a) => a.id === articleId)
    if (!article) return
    setLines([...lines, {
      code: article.code,
      designation: article.designation,
      unit: article.unit,
      quantity: invoiceType === "credit" ? -1 : 1,
      unit_price_puht: article.unit_price_puht,
      vat_rate: article.vat_rate,
      dc_rate: article.dc_rate,
      article_id: article.id,
    }])
  }

  const addFreeformLine = () => {
    setLines([...lines, { code: "", designation: "", unit: null, quantity: 1, unit_price_puht: 0, vat_rate: 19, dc_rate: 1, article_id: null }])
  }

  const updateLine = (i: number, patch: Partial<typeof lines[0]>) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], ...patch }
    setLines(updated)
  }

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) { alert("Select a PME"); return }
    if (!counterpartyId) { alert("Select a counterparty"); return }
    if (lines.length === 0) { alert("Add at least one line"); return }

    setLoading(true)
    try {
      const invoiceLines = lines.map((l) => ({
        article_id: l.article_id,
        code: l.code,
        designation: l.designation,
        unit: l.unit,
        quantity: l.quantity,
        unit_price_puht: l.unit_price_puht,
        remise_percent: 0,
        vat_rate: l.vat_rate,
        dc_rate: l.dc_rate,
      }))

      await createInvoice(
        {
          number: invoiceNumber,
          date,
          due_date: dueDate || null,
          organization_id: organizationId,
          counterparty_kind: "contact",
          counterparty_id: counterpartyId,
          type: invoiceType,
          status: "draft",
          payment_method: paymentMethod || null,
          references: {} as Json,
          notes: notes || null,
        },
        invoiceLines,
        [] // TODO: auto-generate consignments
      )
      router.push("/dashboard/invoices")
    } catch (err) {
      console.error(err)
      alert("Failed to create invoice")
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter((c) => {
    if (invoiceType !== "standard" || true) return c.party_type !== "supplier"
    return true
  })

  const totals = computeInvoiceTotals(lines)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Create {type} Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>PME *</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger><SelectValue placeholder="Select PME" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Counterparty *</Label>
                <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>
                    {filteredContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/contacts/add")}>+ New Contact</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Number</Label><Input value={invoiceNumber} readOnly /></div>
              <div className="grid gap-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger><SelectValue placeholder="Select mode de paiement" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lines</CardTitle>
            <div className="flex gap-2">
              <Select onValueChange={addFromArticle}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Add from article" /></SelectTrigger>
                <SelectContent>
                  {articles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addFreeformLine}>Freeform line</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No lines added yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Designation</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-right p-2">PUHT</th>
                    <th className="text-right p-2">TVA %</th>
                    <th className="text-right p-2">DC %</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1"><Input value={line.code} onChange={(e) => updateLine(i, { code: e.target.value })} className="h-8" /></td>
                      <td className="p-1"><Input value={line.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} className="h-8" /></td>
                      <td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-20 text-right" /></td>
                      <td className="p-1"><Input value={line.unit || ""} onChange={(e) => updateLine(i, { unit: e.target.value || null })} className="h-8 w-20" /></td>
                      <td className="p-1"><Input type="number" step="0.01" value={line.unit_price_puht} onChange={(e) => updateLine(i, { unit_price_puht: Number(e.target.value) })} className="h-8 w-24 text-right" /></td>
                      <td className="p-1"><Input type="number" step="0.01" value={line.vat_rate} onChange={(e) => updateLine(i, { vat_rate: Number(e.target.value) })} className="h-8 w-16 text-right" /></td>
                      <td className="p-1"><Input type="number" step="0.01" value={line.dc_rate} onChange={(e) => updateLine(i, { dc_rate: Number(e.target.value) })} className="h-8 w-16 text-right" /></td>
                      <td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>X</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>HT Subtotal:</span><span>{totals.htSubtotal.toFixed(2)} TND</span></div>
            <div className="flex justify-between"><span>TVA:</span><span>{Object.values(totals.vatByRate).reduce((a, b) => a + b, 0).toFixed(2)} TND</span></div>
            <div className="flex justify-between"><span>DC:</span><span>{Object.values(totals.dcByRate).reduce((a, b) => a + b, 0).toFixed(2)} TND</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>TTC:</span><span>{totals.ttc.toFixed(2)} TND</span></div>
          </CardContent>
        </Card>

        <div className="grid gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Invoice"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
