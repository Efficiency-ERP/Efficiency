"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TaxCharge, TaxBase } from "@/types/database"

export function newTaxCharge(): TaxCharge {
  return { id: crypto.randomUUID(), label: "", rate: 0, base: "ht" }
}

export function defaultTaxCharges(): TaxCharge[] {
  return [
    { id: crypto.randomUUID(), label: "TVA", rate: 19, base: "ht" },
    { id: crypto.randomUUID(), label: "DC", rate: 1, base: "ht" },
  ]
}

export function cloneTaxCharges(charges: TaxCharge[]): TaxCharge[] {
  return charges.map((c) => ({ ...c, id: crypto.randomUUID() }))
}

export function TaxChargesEditor({ charges, onChange }: { charges: TaxCharge[]; onChange: (charges: TaxCharge[]) => void }) {
  const update = (i: number, patch: Partial<TaxCharge>) => {
    const next = [...charges]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const remove = (i: number) => onChange(charges.filter((_, idx) => idx !== i))
  const add = () => onChange([...charges, newTaxCharge()])

  return (
    <div className="space-y-2">
      {charges.map((charge, i) => (
        <div key={charge.id} className="flex gap-2 items-end">
          <div className="grid gap-1 flex-1">
            <Label className="text-xs">Label</Label>
            <Input value={charge.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="TVA, DC, FODEC..." />
          </div>
          <div className="grid gap-1 w-24">
            <Label className="text-xs">Taux %</Label>
            <Input type="number" step="0.01" value={charge.rate} onChange={(e) => update(i, { rate: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1 w-44">
            <Label className="text-xs">Base</Label>
            <Select value={charge.base} onValueChange={(v) => update(i, { base: v as TaxBase })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ht">HT</SelectItem>
                <SelectItem value="transfer">Prix de transfert</SelectItem>
                <SelectItem value="cumulative">Cumulatif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="destructive" size="sm" onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>Add tax</Button>
    </div>
  )
}

export function formatTaxCharges(charges: TaxCharge[]): string {
  if (charges.length === 0) return "-"
  return charges.map((c) => `${c.label} ${c.rate}%`).join(", ")
}
