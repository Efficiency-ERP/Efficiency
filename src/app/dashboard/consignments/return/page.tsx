"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { useMyPme } from "@/hooks/use-my-pme"
import { useActionLog } from "@/hooks/use-action-log"
import { createConsignmentReturn, getConsignmentBalances } from "@/lib/supabase/invoices"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PmeBadge, pmeItemClassName, sortMyPmeFirst } from "@/components/pme-option"
import { formatTND } from "@/lib/utils"
import type { ConsignmentBalance } from "@/types/database"

export default function CreateConsignmentReturnPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts, organizations } = useContactsStore()
  const { isContactMyPme } = useMyPme()
  const logAction = useActionLog("consignments")

  const [organizationId, setOrganizationId] = useState(selectedOrgId !== "all" ? selectedOrgId : "")
  const [counterpartyId, setCounterpartyId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<Array<{ packaging_type: string; quantity: number; deposit_value: number }>>([])
  const [balances, setBalances] = useState<ConsignmentBalance[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [loading, setLoading] = useState(false)

  const counterparty = contacts.find((c) => c.id === counterpartyId)
  // A supplier owes us the refund back (money in); a customer/other is owed
  // the refund by us (money out) — same inference the invoice flow uses.
  const direction: "in" | "out" = counterparty?.party_type === "supplier" ? "in" : "out"

  useEffect(() => {
    setLines([])
    if (!counterpartyId) { setBalances([]); return }
    setLoadingBalances(true)
    getConsignmentBalances(counterpartyId)
      .then(setBalances)
      .catch((err) => { console.error(err); setBalances([]) })
      .finally(() => setLoadingBalances(false))
  }, [counterpartyId])

  const addFreeformLine = () => setLines([...lines, { packaging_type: "", quantity: 1, deposit_value: 0 }])
  const addFromBalance = (b: ConsignmentBalance) => {
    const unitDeposit = b.quantity_outstanding !== 0 ? b.deposit_outstanding / b.quantity_outstanding : 0
    setLines([...lines, { packaging_type: b.packaging_type, quantity: b.quantity_outstanding, deposit_value: unitDeposit }])
  }
  const updateLine = (i: number, patch: Partial<typeof lines[0]>) => { const u = [...lines]; u[i] = { ...u[i], ...patch }; setLines(u) }
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) { alert("Select an issuing organization"); return }
    if (!counterpartyId) { alert("Select a counterparty"); return }
    if (lines.length === 0) { alert("Add at least one line"); return }
    if (lines.some((l) => !l.packaging_type.trim())) { alert("Every line needs a packaging type"); return }

    setLoading(true)
    try {
      await createConsignmentReturn(
        { organization_id: organizationId, counterparty_id: counterpartyId, date, direction, notes: notes || null },
        lines.map((l) => ({ packaging_type: l.packaging_type, units_per_article: 1, quantity: l.quantity, deposit_value: l.deposit_value }))
      )
      await logAction(`Recorded consignment return for ${counterparty?.company_name || "counterparty"}`, undefined, organizationId)
      router.push("/dashboard/consignments")
    } catch (err) {
      console.error(err)
      alert("Failed to record return")
    } finally {
      setLoading(false)
    }
  }

  const sortedContacts = sortMyPmeFirst(contacts, isContactMyPme)
  const total = lines.reduce((s, l) => s + l.quantity * l.deposit_value, 0)

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Record Consignment Return</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Header</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Issuing Organization *</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger><SelectValue placeholder="Select issuing organization" /></SelectTrigger>
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
                    {sortedContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className={pmeItemClassName(isContactMyPme(c))}>
                        {c.company_name}
                        {isContactMyPme(c) && <PmeBadge />}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              {counterpartyId && (
                <div className="grid gap-2">
                  <Label>Cash Flow</Label>
                  <div className="text-sm py-2">{direction === "in" ? "In — they refund us" : "Out — we refund them"}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {counterpartyId && (
          <Card>
            <CardHeader><CardTitle>Outstanding for this counterparty</CardTitle></CardHeader>
            <CardContent>
              {loadingBalances ? (
                <div className="text-muted-foreground text-sm">Loading...</div>
              ) : balances.length === 0 ? (
                <div className="text-muted-foreground text-sm">Nothing outstanding on record for this counterparty.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b"><th className="text-left p-2">Type</th><th className="text-right p-2">Outstanding Qty</th><th className="text-right p-2">Outstanding Value</th><th></th></tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => (
                      <tr key={b.packaging_type} className="border-b">
                        <td className="p-2">{b.packaging_type}</td>
                        <td className="p-2 text-right">{b.quantity_outstanding}</td>
                        <td className="p-2 text-right">{formatTND(b.deposit_outstanding)}</td>
                        <td className="p-2 text-right"><Button type="button" size="sm" variant="outline" onClick={() => addFromBalance(b)}>Return all</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lines</CardTitle>
            <Button type="button" variant="outline" onClick={addFreeformLine}>Add line</Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? <div className="text-center py-8 text-muted-foreground">No lines</div> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="text-left p-2">Type</th><th className="text-right p-2">Qty Returned</th><th className="text-right p-2">Deposit/Unit</th><th className="text-right p-2">Total</th><th></th></tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1"><Input value={line.packaging_type} onChange={(e) => updateLine(i, { packaging_type: e.target.value })} className="h-8" /></td>
                      <td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-24 text-right" /></td>
                      <td className="p-1"><Input type="number" step="0.01" value={line.deposit_value} onChange={(e) => updateLine(i, { deposit_value: Number(e.target.value) })} className="h-8 w-24 text-right" /></td>
                      <td className="p-2 text-right">{formatTND(line.quantity * line.deposit_value)}</td>
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
          <CardContent>
            <div className="flex justify-between font-bold"><span>Refund Total:</span><span>{formatTND(total)}</span></div>
          </CardContent>
        </Card>

        <div className="grid gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Return"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
