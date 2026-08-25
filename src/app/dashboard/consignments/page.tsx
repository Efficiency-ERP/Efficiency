"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatTND } from "@/lib/utils"
import { getAllConsignmentBalances } from "@/lib/supabase/invoices"
import type { ConsignmentBalance } from "@/types/database"

export default function ConsignmentsPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts } = useContactsStore()
  const [balances, setBalances] = useState<ConsignmentBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getAllConsignmentBalances(orgId)
        setBalances(data)
      } catch (err) {
        console.error("Failed to load consignment balances:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const totalOutstanding = useMemo(() => balances.reduce((s, b) => s + b.deposit_outstanding, 0), [balances])

  if (loading) return <div className="text-muted-foreground">Loading consignments...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consignments</h1>
        <Button onClick={() => router.push("/dashboard/consignments/return")}>Record Return</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Counterparties with a balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{new Set(balances.map((b) => b.counterparty_id)).size}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Outstanding Deposits</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatTND(totalOutstanding)}</CardContent></Card>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Counterparty</th>
              <th className="text-left p-3">Packaging Type</th>
              <th className="text-right p-3">Outstanding Qty</th>
              <th className="text-right p-3">Outstanding Value</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {balances.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No outstanding consignments</td></tr>
            ) : balances.map((b) => {
              const contact = contacts.find((c) => c.id === b.counterparty_id)
              return (
                <tr key={`${b.counterparty_id}-${b.packaging_type}`} className="border-b hover:bg-muted/30">
                  <td className="p-3">{contact?.company_name || "Unknown"}</td>
                  <td className="p-3">{b.packaging_type}</td>
                  <td className="p-3 text-right">{b.quantity_outstanding}</td>
                  <td className="p-3 text-right">{formatTND(b.deposit_outstanding)}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/contacts/${b.counterparty_id}`)}>View contact</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
