"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { getDeliveries } from "@/lib/supabase/invoices"
import { SectionTabs } from "@/components/section-tabs"
import { SALES_TABS } from "@/lib/section-tabs-config"
import type { Delivery } from "@/types/database"

export default function DeliveriesListPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts } = useContactsStore()
  const [search, setSearch] = useState("")
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getDeliveries(orgId)
        setDeliveries(data)
      } catch (err) {
        console.error("Failed to load deliveries:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (search && !d.number.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [deliveries, search])

  if (loading) return <div className="text-muted-foreground">Loading deliveries...</div>

  return (
    <div className="space-y-4">
      <SectionTabs tabs={SALES_TABS} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <Button onClick={() => router.push("/dashboard/deliveries/create")}>Create Delivery</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-1 md:max-w-xs">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{deliveries.length}</CardContent></Card>
      </div>
      <Input placeholder="Search by number..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Counterparty</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No deliveries found</td></tr>
            ) : filteredDeliveries.map((d) => (
              <tr key={d.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <button onClick={() => router.push(`/dashboard/deliveries/${d.id}`)} className="underline hover:no-underline">
                    {d.number}
                  </button>
                </td>
                <td className="p-3">{d.date}</td>
                <td className="p-3">{contactById.get(d.counterparty_id)?.company_name || "N/A"}</td>
                <td className="p-3"><Badge variant={d.status === "final" ? "default" : "outline"}>{d.status}</Badge></td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/deliveries/${d.id}`)}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
