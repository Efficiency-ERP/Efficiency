"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { formatTND, castJson } from "@/lib/utils"
import { getInvoices } from "@/lib/supabase/invoices"
import type { Invoice, InvoiceTotals } from "@/types/database"

export default function AllInvoicesPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getInvoices(orgId)
        setInvoices(data)
      } catch (err) {
        console.error("Failed to load invoices:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (search) {
        const q = search.toLowerCase()
        if (!inv.number.toLowerCase().includes(q)) return false
      }
      if (typeFilter !== "all" && inv.type !== typeFilter) return false
      return true
    })
  }, [invoices, search, typeFilter])

  const totalCount = invoices.length
  const moneyIn = invoices.filter((i) => i.direction === "in").reduce((s, i) => s + ((castJson<InvoiceTotals>(i.totals)).ttc || 0), 0)
  const moneyOut = invoices.filter((i) => i.direction === "out").reduce((s, i) => s + ((castJson<InvoiceTotals>(i.totals)).ttc || 0), 0)

  if (loading) return <div className="text-muted-foreground">Loading invoices...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/dashboard/invoices/create")}>Create Invoice</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totalCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Money In</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-600">{formatTND(moneyIn)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Money Out</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-red-600">{formatTND(moneyOut)}</CardContent></Card>
      </div>
      <div className="flex gap-4">
        <Input
          placeholder="Search by number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">TTC</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No invoices found</td></tr>
            ) : filteredInvoices.map((inv) => {
              const totals = castJson<InvoiceTotals>(inv.totals)
              return (
                <tr key={inv.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <button onClick={() => router.push(`/dashboard/invoices/${inv.id}`)} className="underline hover:no-underline">
                      {inv.number}
                    </button>
                  </td>
                  <td className="p-3">{inv.date}</td>
                  <td className="p-3"><Badge variant="outline">{inv.type}</Badge></td>
                  <td className="p-3 text-right">{formatTND(totals.ttc || 0)}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>View</Button>
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
