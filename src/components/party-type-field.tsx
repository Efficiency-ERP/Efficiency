"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Contact } from "@/types/database"

export const STANDARD_PARTY_TYPES = ["customer", "supplier", "both"] as const

const OTHER_SENTINEL = "__other__"

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
        <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="customer">Customer</SelectItem>
          <SelectItem value="supplier">Supplier</SelectItem>
          <SelectItem value="both">Both</SelectItem>
          {suggestions.length > 0 && <SelectSeparator />}
          {suggestions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={OTHER_SENTINEL}>Other...</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input autoFocus placeholder="Enter a new party type" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}
