"use client"

import { use, useState, useEffect } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatTND, castJson, paymentMethodLabel } from "@/lib/utils"
import { formatTaxCharges } from "@/components/tax-charges-editor"
import { getInvoice, getInvoiceLines, getConsignments } from "@/lib/supabase/invoices"
import type { Invoice, InvoiceLine, ConsignmentLine, InvoiceTotals, TaxCharge } from "@/types/database"

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts } = useContactsStore()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [consignments, setConsignments] = useState<ConsignmentLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const inv = await getInvoice(id)
        setInvoice(inv)
        if (inv) {
          const [lns, cons] = await Promise.all([
            getInvoiceLines(inv.id),
            getConsignments(inv.id),
          ])
          setLines(lns)
          setConsignments(cons)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const counterparty = invoice ? contacts.find((c) => c.id === invoice.counterparty_id) : null

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  if (!invoice) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Facture introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/invoices")}>Back to invoices</Button>
    </div>
  )

  const totals = castJson<InvoiceTotals>(invoice.totals)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <p className="text-muted-foreground">{invoice.date}</p>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && <Button variant="outline" onClick={() => router.push(`/dashboard/invoices/${id}/edit`)}>Edit</Button>}
          <Button variant="outline" onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>En-tête</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Emetteur:</span> {counterparty?.company_name || "N/A"}</div>
          <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{invoice.type}</Badge></div>
          <div><span className="text-muted-foreground">Status:</span> <Badge>{invoice.status}</Badge></div>
          <div><span className="text-muted-foreground">Due Date:</span> {invoice.due_date || "N/A"}</div>
          <div><span className="text-muted-foreground">Mode de paiement:</span> {paymentMethodLabel(invoice.payment_method)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b"><th className="text-left p-2">Code</th><th className="text-left p-2">Designation</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Unit</th><th className="text-right p-2">PUHT</th><th className="text-left p-2">Taxes</th></tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="p-2">{line.code}</td>
                  <td className="p-2">{line.designation}</td>
                  <td className="p-2 text-right">{line.quantity}</td>
                  <td className="p-2">{line.unit || "-"}</td>
                  <td className="p-2 text-right">{line.unit_price_puht}</td>
                  <td className="p-2">{formatTaxCharges(castJson<TaxCharge[]>(line.tax_charges))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {consignments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Consignements</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">Type</th><th className="text-right p-2">Units/Art</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Deposit/Unit</th><th className="text-right p-2">Total</th></tr></thead>
              <tbody>
                {consignments.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2">{c.packaging_type}</td>
                    <td className="p-2 text-right">{c.units_per_article}</td>
                    <td className="p-2 text-right">{c.quantity}</td>
                    <td className="p-2 text-right">{formatTND(c.deposit_value)}</td>
                    <td className="p-2 text-right">{formatTND(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>HT Subtotal:</span><span>{formatTND(totals.htSubtotal || 0)}</span></div>
          {Object.entries(totals.chargesByKey || {}).map(([key, amount]) => (
            <div key={key} className="flex justify-between"><span>{key}:</span><span>{formatTND(amount)}</span></div>
          ))}
          <div className="flex justify-between font-bold border-t pt-2"><span>TTC:</span><span>{formatTND(totals.ttc || 0)}</span></div>
        </CardContent>
      </Card>
    </div>
  )
}
