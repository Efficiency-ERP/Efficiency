"use client"

import { use, useState, useEffect } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatTND, castJson } from "@/lib/utils"
import { formatTaxCharges } from "@/components/tax-charges-editor"
import { getQuote, getQuoteLines } from "@/lib/supabase/invoices"
import type { Quote, QuoteLine, InvoiceTotals, TaxCharge } from "@/types/database"

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts } = useContactsStore()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [lines, setLines] = useState<QuoteLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const q = await getQuote(id)
        setQuote(q)
        if (q) setLines(await getQuoteLines(q.id))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const counterparty = quote ? contacts.find((c) => c.id === quote.counterparty_id) : null

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  if (!quote) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Quote not found</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/quotes")}>Back to quotes</Button>
    </div>
  )

  const totals = castJson<InvoiceTotals>(quote.totals)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{quote.number}</h1>
          <p className="text-muted-foreground">{quote.date}</p>
        </div>
        <div className="flex gap-2">
          {quote.status !== "accepted" && (
            <Button onClick={() => router.push(`/dashboard/invoices/create/standard?sourceQuoteId=${quote.id}`)}>
              Validate → Create Invoice
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Counterparty:</span> {counterparty?.company_name || "N/A"}</div>
          <div><span className="text-muted-foreground">Status:</span> <Badge>{quote.status}</Badge></div>
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
