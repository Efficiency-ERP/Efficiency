"use client"

import { use, useState, useEffect, Fragment } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { useArticlesStore } from "@/contexts/articles-store"
import { useMyPme } from "@/hooks/use-my-pme"
import { useActionLog } from "@/hooks/use-action-log"
import { createInvoice, getNextDocumentNumber, defaultDirectionFor, computeInvoiceTotals, getInvoices, getInvoice, getInvoiceLines, getOrder, getOrderLines, getQuote, getQuoteLines, markOrderFinal, markQuoteAccepted } from "@/lib/supabase/invoices"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PmeBadge, pmeItemClassName, sortMyPmeFirst } from "@/components/pme-option"
import { PAYMENT_METHODS, castJson } from "@/lib/utils"
import { TaxChargesEditor, defaultTaxCharges, cloneTaxCharges, formatTaxCharges } from "@/components/tax-charges-editor"
import type { Json, PaymentMethod, TaxCharge, InvoiceDirection, Invoice } from "@/types/database"

export default function CreateInvoiceFormPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedOrgId } = usePMESelection()
  const { contacts, organizations } = useContactsStore()
  const { articles } = useArticlesStore()
  const { isContactMyPme, isArticleMyPme } = useMyPme()
  const logAction = useActionLog("invoices")

  const invoiceType = type as "standard" | "credit" | "debit"
  const isAdjustment = invoiceType === "credit" || invoiceType === "debit"
  const sourceOrderId = searchParams.get("sourceOrderId")
  const sourceQuoteId = searchParams.get("sourceQuoteId")
  const originalInvoiceIdParam = searchParams.get("originalInvoiceId")
  const flow: "sale" | "purchase" = sourceOrderId ? "purchase" : "sale"

  const [organizationId, setOrganizationId] = useState(selectedOrgId !== "all" ? selectedOrgId : "")
  const [counterpartyId, setCounterpartyId] = useState(searchParams.get("selectedContact") || "")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [direction, setDirection] = useState<InvoiceDirection>(defaultDirectionFor(flow, invoiceType))
  const [originalInvoiceId, setOriginalInvoiceId] = useState("")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<Array<{ code: string; designation: string; unit: string | null; quantity: number; unit_price_puht: number; transfer_price: number; tax_charges: TaxCharge[]; article_id: string | null }>>([])
  const [expandedLine, setExpandedLine] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(Boolean(sourceOrderId || sourceQuoteId || originalInvoiceIdParam))
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)

  useEffect(() => {
    if (isAdjustment && !originalInvoiceIdParam) getInvoices().then(setInvoices).catch(console.error)
  }, [isAdjustment, originalInvoiceIdParam])

  useEffect(() => {
    async function prefillFromOriginalInvoice() {
      try {
        const original = await getInvoice(originalInvoiceIdParam!)
        if (!original) return
        const originalLines = await getInvoiceLines(original.id)
        setOrganizationId(original.organization_id)
        setCounterpartyId(original.counterparty_id)
        setOriginalInvoiceId(original.id)
        setLines(originalLines.map((l) => ({
          code: l.code,
          designation: l.designation,
          unit: l.unit,
          quantity: invoiceType === "credit" ? -l.quantity : l.quantity,
          unit_price_puht: l.unit_price_puht,
          transfer_price: 0,
          tax_charges: cloneTaxCharges(castJson<TaxCharge[]>(l.tax_charges)),
          article_id: l.article_id,
        })))
        setDirection(invoiceType === "credit" ? (original.direction === "in" ? "out" : "in") : original.direction)
        setSourceLabel(`invoice ${original.number}`)
      } catch (err) {
        console.error(err)
        alert("Failed to load original invoice")
      } finally {
        setPrefilling(false)
      }
    }
    if (originalInvoiceIdParam) prefillFromOriginalInvoice()
  }, [originalInvoiceIdParam, invoiceType])

  useEffect(() => {
    async function prefillFromSource() {
      try {
        if (sourceOrderId) {
          const order = await getOrder(sourceOrderId)
          if (!order) return
          const orderLines = await getOrderLines(sourceOrderId)
          setOrganizationId(order.organization_id)
          setCounterpartyId(order.counterparty_id)
          setLines(orderLines.map((l) => ({
            code: l.code,
            designation: l.designation,
            unit: l.unit,
            quantity: l.quantity,
            unit_price_puht: l.unit_price ?? 0,
            transfer_price: 0,
            tax_charges: defaultTaxCharges(),
            article_id: null,
          })))
          setDirection(defaultDirectionFor("purchase", "standard"))
          setSourceLabel(`order ${order.number}`)
        } else if (sourceQuoteId) {
          const quote = await getQuote(sourceQuoteId)
          if (!quote) return
          const quoteLines = await getQuoteLines(sourceQuoteId)
          setOrganizationId(quote.organization_id)
          setCounterpartyId(quote.counterparty_id)
          setNotes(quote.notes || "")
          setLines(quoteLines.map((l) => ({
            code: l.code,
            designation: l.designation,
            unit: l.unit,
            quantity: l.quantity,
            unit_price_puht: l.unit_price_puht,
            transfer_price: 0,
            tax_charges: cloneTaxCharges(castJson<TaxCharge[]>(l.tax_charges)),
            article_id: l.article_id,
          })))
          setDirection(defaultDirectionFor("sale", "standard"))
          setSourceLabel(`quote ${quote.number}`)
        }
      } catch (err) {
        console.error(err)
        alert("Failed to load source document")
      } finally {
        setPrefilling(false)
      }
    }
    if (sourceOrderId || sourceQuoteId) prefillFromSource()
  }, [sourceOrderId, sourceQuoteId])

  const addFromArticle = (articleId: string) => {
    const article = articles.find((a) => a.id === articleId)
    if (!article) return
    setLines([...lines, {
      code: article.code,
      designation: article.designation,
      unit: article.unit,
      quantity: invoiceType === "credit" ? -1 : 1,
      unit_price_puht: article.unit_price_puht,
      transfer_price: article.transfer_price,
      tax_charges: cloneTaxCharges(castJson<TaxCharge[]>(article.tax_charges)),
      article_id: article.id,
    }])
  }

  const addFreeformLine = () => {
    setLines([...lines, { code: "", designation: "", unit: null, quantity: 1, unit_price_puht: 0, transfer_price: 0, tax_charges: defaultTaxCharges(), article_id: null }])
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
    if (isAdjustment && !originalInvoiceId) { alert("Select the original invoice"); return }

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
        tax_charges: l.tax_charges as unknown as Json,
        transfer_price: l.transfer_price,
      }))

      const numberPrefix = invoiceType === "credit" ? "CN" : invoiceType === "debit" ? "DN" : "I"
      const invoice = await createInvoice(
        {
          number: await getNextDocumentNumber(organizationId, numberPrefix),
          date,
          due_date: dueDate || null,
          organization_id: organizationId,
          counterparty_kind: "contact",
          counterparty_id: counterpartyId,
          type: invoiceType,
          direction,
          payment_method: paymentMethod || null,
          source_order_id: sourceOrderId || null,
          source_quote_id: sourceQuoteId || null,
          source_delivery_id: null,
          original_invoice_id: isAdjustment ? (originalInvoiceId || null) : null,
          notes: notes || null,
        },
        invoiceLines,
        [] // TODO: auto-generate consignments
      )
      if (sourceOrderId) await markOrderFinal(sourceOrderId)
      if (sourceQuoteId) await markQuoteAccepted(sourceQuoteId)
      await logAction(`Created ${invoiceType} invoice ${invoice.number}`, invoice.id, organizationId)
      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (err) {
      console.error(err)
      alert("Failed to create invoice")
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = sortMyPmeFirst(
    contacts.filter((c) => (invoiceType === "standard" && !sourceOrderId ? c.party_type !== "supplier" : true)),
    isContactMyPme
  )
  const sortedArticles = sortMyPmeFirst(articles, isArticleMyPme)

  const totals = computeInvoiceTotals(lines)

  if (prefilling) return <div className="text-muted-foreground">Loading source document...</div>

  const pageTitle = sourceLabel
    ? isAdjustment
      ? `${invoiceType === "credit" ? "Add Credit Note" : "Add Debit Note"} — from ${sourceLabel}`
      : `Confirm Invoice — from ${sourceLabel}`
    : `Create ${type} Invoice`

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{pageTitle}</h1>

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
                      <SelectItem key={c.id} value={c.id} className={pmeItemClassName(isContactMyPme(c))}>
                        {c.company_name}
                        {isContactMyPme(c) && <PmeBadge />}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/contacts/add")}>+ New Contact</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Number</Label><Input value="Auto-generated on save" readOnly /></div>
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
              <div className="grid gap-2">
                <Label>Direction *</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as InvoiceDirection)}>
                  <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Money in</SelectItem>
                    <SelectItem value="out">Money out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdjustment && !originalInvoiceIdParam && (
                <div className="grid gap-2">
                  <Label>Original invoice *</Label>
                  <Select value={originalInvoiceId} onValueChange={setOriginalInvoiceId}>
                    <SelectTrigger><SelectValue placeholder="Select invoice being adjusted" /></SelectTrigger>
                    <SelectContent>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  {sortedArticles.map((a) => (
                    <SelectItem key={a.id} value={a.id} className={pmeItemClassName(isArticleMyPme(a))}>
                      {a.code} — {a.designation}
                      {isArticleMyPme(a) && <PmeBadge />}
                    </SelectItem>
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
                    <th className="text-left p-2">Taxes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <Fragment key={i}>
                      <tr className="border-b">
                        <td className="p-1"><Input value={line.code} onChange={(e) => updateLine(i, { code: e.target.value })} className="h-8" /></td>
                        <td className="p-1"><Input value={line.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} className="h-8" /></td>
                        <td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-20 text-right" /></td>
                        <td className="p-1"><Input value={line.unit || ""} onChange={(e) => updateLine(i, { unit: e.target.value || null })} className="h-8 w-20" /></td>
                        <td className="p-1"><Input type="number" step="0.01" value={line.unit_price_puht} onChange={(e) => updateLine(i, { unit_price_puht: Number(e.target.value) })} className="h-8 w-24 text-right" /></td>
                        <td className="p-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => setExpandedLine(expandedLine === i ? null : i)}>
                            {formatTaxCharges(line.tax_charges)}
                          </Button>
                        </td>
                        <td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>X</Button></td>
                      </tr>
                      {expandedLine === i && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={7} className="p-3">
                            <TaxChargesEditor charges={line.tax_charges} onChange={(charges) => updateLine(i, { tax_charges: charges })} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
            {Object.entries(totals.chargesByKey).map(([key, amount]) => (
              <div key={key} className="flex justify-between"><span>{key}:</span><span>{amount.toFixed(2)} TND</span></div>
            ))}
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
