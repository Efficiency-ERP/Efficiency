"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Contact } from "@/types/database"

export const STANDARD_PARTY_TYPES = ["customer", "supplier", "both"] as const

const OTHER_SENTINEL = "__other__"

// The standard types are stored in English; a custom type is shown as typed.
const PARTY_TYPE_LABELS: Record<string, string> = {
  customer: "Client",
  supplier: "Fournisseur",
  both: "Client et fournisseur",
}

export function partyTypeLabel(type: string): string {
  return PARTY_TYPE_LABELS[type] ?? type
}

export function partyTypeSuggestions(contacts: Contact[]): string[] {
  const standard: readonly string[] = STANDARD_PARTY_TYPES
  const custom = new Set(
    contacts.map((c) => c.party_type).filter((t) => t && !standard.includes(t))
  )
  return Array.from(custom).sort()
}

export function PartyTypeField({ value, onChange, contacts }: { value: string; onChange: (value: string) => void; contacts: Contact[] }) {
  const suggestions = partyTypeSuggestions(contacts)
  const isKnown = (STANDARD_PARTY_TYPES as readonly string[]).includes(value) || suggestions.includes(value)
  const [customMode, setCustomMode] = useState(!isKnown && value !== "")

  const handleSelect = (v: string) => {
    if (v === OTHER_SENTINEL) {
      setCustomMode(true)
      onChange("")
    } else {
      setCustomMode(false)
      onChange(v)
    }
  }

  return (
    <div className="space-y-2">
      <Select value={customMode ? OTHER_SENTINEL : value} onValueChange={handleSelect}>
        <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="customer">Client</SelectItem>
          <SelectItem value="supplier">Fournisseur</SelectItem>
          <SelectItem value="both">Les deux</SelectItem>
          {suggestions.length > 0 && <SelectSeparator />}
          {suggestions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={OTHER_SENTINEL}>Autre...</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input autoFocus placeholder="Saisir un nouveau type de tiers" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}
