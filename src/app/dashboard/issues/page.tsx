"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { getIssues } from "@/lib/supabase/invoices"
import { SectionTabs } from "@/components/section-tabs"
import { ARTICLES_TABS } from "@/lib/section-tabs-config"
import type { Issue } from "@/types/database"

export default function IssuesListPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { contacts } = useContactsStore()
  const [search, setSearch] = useState("")
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getIssues(orgId)
        setIssues(data)
      } catch (err) {
        console.error("Failed to load issues:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (search && !i.number.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [issues, search])

  if (loading) return <div className="text-muted-foreground">Loading issues...</div>

  return (
    <div className="space-y-4">
      <SectionTabs tabs={ARTICLES_TABS} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Issues</h1>
        <Button onClick={() => router.push("/dashboard/issues/create")}>Create Issue</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-1 md:max-w-xs">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{issues.length}</CardContent></Card>
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
            {filteredIssues.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No issues found</td></tr>
            ) : filteredIssues.map((i) => (
              <tr key={i.id} className="border-b hover:bg-muted/30">
                <td className="p-3">
                  <button onClick={() => router.push(`/dashboard/issues/${i.id}`)} className="underline hover:no-underline">
                    {i.number}
                  </button>
                </td>
                <td className="p-3">{i.date}</td>
                <td className="p-3">{contactById.get(i.counterparty_id)?.company_name || "N/A"}</td>
                <td className="p-3"><Badge variant={i.status === "final" ? "default" : "outline"}>{i.status}</Badge></td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/issues/${i.id}`)}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
