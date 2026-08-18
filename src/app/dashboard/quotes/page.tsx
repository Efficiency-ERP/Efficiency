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
import { getQuotes } from "@/lib/supabase/invoices"
import type { Quote, InvoiceTotals } from "@/types/database"

export default function AllQuotesPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getQuotes(orgId)
        setQuotes(data)
      } catch (err) {
        console.error("Failed to load quotes:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (search && !q.number.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== "all" && q.status !== statusFilter) return false
      return true
    })
  }, [quotes, search, statusFilter])

  const statusVariant = (status: string) => {
    switch (status) {
      case "accepted": return "default" as const
      case "rejected": return "destructive" as const
      case "sent": return "secondary" as const
      default: return "outline" as const
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading quotes...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Button onClick={() => router.push("/dashboard/quotes/create")}>Create Quote</Button>
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{quotes.length}</CardContent></Card>
      <div className="flex gap-4">
        <Input
          placeholder="Search by number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">TTC</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No quotes found</td></tr>
            ) : filteredQuotes.map((q) => {
              const totals = castJson<InvoiceTotals>(q.totals)
              return (
                <tr key={q.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <button onClick={() => router.push(`/dashboard/quotes/${q.id}`)} className="underline hover:no-underline">
                      {q.number}
                    </button>
                  </td>
                  <td className="p-3">{q.date}</td>
                  <td className="p-3"><Badge variant={statusVariant(q.status)}>{q.status}</Badge></td>
                  <td className="p-3 text-right">{formatTND(totals.ttc || 0)}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/quotes/${q.id}`)}>View</Button>
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
