"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { getOrders } from "@/lib/supabase/invoices"
import type { Order } from "@/types/database"

export default function OrdersListPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts } = useContactsStore()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getOrders(orgId)
        setOrders(data)
      } catch (err) {
        console.error("Failed to load orders:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.number.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter !== "all" && o.type !== typeFilter) return false
      return true
    })
  }, [orders, search, typeFilter])

  if (loading) return <div className="text-muted-foreground">Loading orders...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button onClick={() => router.push("/dashboard/orders/create?type=supplier")}>Create Order</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-1 md:max-w-xs">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{orders.length}</CardContent></Card>
      </div>
      <div className="flex gap-4">
        <Input placeholder="Search by number..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="interco">Interco</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Counterparty</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No orders found</td></tr>
            ) : filteredOrders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <button onClick={() => router.push(`/dashboard/orders/${o.id}`)} className="underline hover:no-underline">
                    {o.number}
                  </button>
                </td>
                <td className="p-3">{o.date}</td>
                <td className="p-3">{contactById.get(o.counterparty_id)?.company_name || "N/A"}</td>
                <td className="p-3"><Badge variant="outline">{o.type}</Badge></td>
                <td className="p-3"><Badge variant={o.status === "final" ? "default" : "outline"}>{o.status}</Badge></td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/orders/${o.id}`)}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
