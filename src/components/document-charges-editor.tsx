"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DocumentCharge, DocumentChargeBase } from "@/types/database"

export function newDocumentCharge(): DocumentCharge {
  return { id: crypto.randomUUID(), label: "", kind: "fixed", amount: 0 }
}

// The legal stamp amount changes with each finance law, so it is never
// hardcoded — it comes from the issuing organization's stamp_duty.
export function stampCharge(amount: number): DocumentCharge {
  return { id: crypto.randomUUID(), label: "Timbre fiscal", kind: "fixed", amount }
}

export function DocumentChargesEditor({
  charges,
  onChange,
}: {
  charges: DocumentCharge[]
  onChange: (charges: DocumentCharge[]) => void
}) {
  const update = (i: number, patch: Partial<DocumentCharge>) => {
    const next = [...charges]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const remove = (i: number) => onChange(charges.filter((_, idx) => idx !== i))
  const add = () => onChange([...charges, newDocumentCharge()])

  // Switching kind drops the other kind's field so a stale rate can never be
  // read back by computeInvoiceTotals.
  const switchKind = (i: number, kind: DocumentCharge["kind"]) => {
    const next = [...charges]
    next[i] = kind === "percent"
      ? { id: next[i].id, label: next[i].label, kind, rate: 0, base: "ht" }
      : { id: next[i].id, label: next[i].label, kind, amount: 0 }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {charges.map((charge, i) => (
        <div key={charge.id} className="flex gap-2 items-end">
          <div className="grid gap-1 flex-1">
            <Label className="text-xs">Libellé</Label>
            <Input value={charge.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Timbre fiscal..." />
          </div>
          <div className="grid gap-1 w-36">
            <Label className="text-xs">Type</Label>
            <Select value={charge.kind} onValueChange={(v) => switchKind(i, v as DocumentCharge["kind"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Montant fixe</SelectItem>
                <SelectItem value="percent">Pourcentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {charge.kind === "percent" ? (
            <>
              <div className="grid gap-1 w-24">
                <Label className="text-xs">Taux %</Label>
                <Input type="number" step="0.01" value={charge.rate ?? 0} onChange={(e) => update(i, { rate: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1 w-28">
                <Label className="text-xs">Base</Label>
                <Select value={charge.base || "ht"} onValueChange={(v) => update(i, { base: v as DocumentChargeBase })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ht">Total HT</SelectItem>
                    <SelectItem value="ttc">Total TTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="grid gap-1 w-32">
              <Label className="text-xs">Montant TND</Label>
              <Input type="number" step="0.001" value={charge.amount ?? 0} onChange={(e) => update(i, { amount: Number(e.target.value) })} />
            </div>
          )}
          <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>Supprimer</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>Ajouter une charge</Button>
    </div>
  )
}
