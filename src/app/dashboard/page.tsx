"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useArticlesStore } from "@/contexts/articles-store"
import { usePMESelection } from "@/contexts/pme-context"
import { formatTND, castJson, withTimeout } from "@/lib/utils"
import { useRouter } from "next/navigation"
import SalesBarChart from "@/components/SalesBarChart"
import { getInvoices, correctionSign } from "@/lib/supabase/invoices"
import { getOrders } from "@/lib/supabase/invoices"
import { getDeliveries } from "@/lib/supabase/invoices"
import { getIssues } from "@/lib/supabase/invoices"
import type { Stock, InvoiceTotals, Invoice, Order, Delivery, Issue } from "@/types/database"

type Range = "7" | "30" | "90" | "ytd"

function signedTtc(inv: Invoice): number {
  const magnitude = correctionSign(inv.type) * (castJson<InvoiceTotals>(inv.totals).ttc || 0)
  return inv.direction === "out" ? -magnitude : magnitude
}

function getRangeStartDate(range: Range): Date {
  const now = new Date()
  if (range === "ytd") return new Date(now.getFullYear(), 0, 1)
  const days = Number(range)
  now.setDate(now.getDate() - days)
  return now
}

export default function DashboardHome() {
  const router = useRouter()
  const { articles } = useArticlesStore()
  const { selectedOrgId, selectedOrgName } = usePMESelection()
  const [range, setRange] = useState<Range>("30")

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([])
  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  const isTenant = selectedOrgId === "all"
  const now = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => now.toISOString().slice(0, 10), [now])

  useEffect(() => {
    const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
    const TIMEOUT = 12000

    async function load() {
      try {
        const results = await Promise.allSettled([
          withTimeout(getInvoices(orgId), TIMEOUT, "Invoices"),
          withTimeout(getOrders(orgId), TIMEOUT, "Orders"),
          withTimeout(getDeliveries(orgId), TIMEOUT, "Deliveries"),
          withTimeout(getIssues(orgId), TIMEOUT, "Issues"),
        ])
        if (results[0].status === "fulfilled") setAllInvoices(results[0].value)
        if (results[1].status === "fulfilled") setAllOrders(results[1].value)
        if (results[2].status === "fulfilled") setAllDeliveries(results[2].value)
        if (results[3].status === "fulfilled") setAllIssues(results[3].value)
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const rangeStart = getRangeStartDate(range)

  const filteredInvoices = useMemo(() =>
    allInvoices.filter((inv) => new Date(inv.date) >= rangeStart),
    [allInvoices, rangeStart]
  )

  const revenueMTD = useMemo(() => {
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return filteredInvoices
      .filter((inv) => new Date(inv.date) >= mtdStart)
      .reduce((s, inv) => s + signedTtc(inv), 0)
  }, [filteredInvoices, now])

  const revenueToday = useMemo(() =>
    filteredInvoices
      .filter((inv) => inv.date === todayStr)
      .reduce((s, inv) => s + signedTtc(inv), 0),
    [filteredInvoices, todayStr]
  )

  const revenueYTD = useMemo(() => {
    const ytdStart = new Date(now.getFullYear(), 0, 1)
    return allInvoices
      .filter((inv) => new Date(inv.date) >= ytdStart)
      .reduce((s, inv) => s + signedTtc(inv), 0)
  }, [allInvoices, now])

  const moneyOutMTD = useMemo(() => {
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return filteredInvoices
      .filter((inv) => new Date(inv.date) >= mtdStart && inv.direction === "out")
      .reduce((s, inv) => s + correctionSign(inv.type) * (castJson<InvoiceTotals>(inv.totals).ttc || 0), 0)
  }, [filteredInvoices, now])

  const inCount = filteredInvoices.filter((i) => i.direction === "in").length
  const outCount = filteredInvoices.filter((i) => i.direction === "out").length

  const taxesMTD = useMemo(() => {
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return filteredInvoices
      .filter((inv) => new Date(inv.date) >= mtdStart)
      .reduce((s, inv) => s + correctionSign(inv.type) * Object.values(castJson<InvoiceTotals>(inv.totals).chargesByKey || {}).reduce((a, b) => a + b, 0), 0)
  }, [filteredInvoices, now])

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentYear = now.getFullYear()
    return months.slice(0, 6).map((label, i) => {
      const monthStart = new Date(currentYear, i, 1)
      const monthEnd = new Date(currentYear, i + 1, 0)
      const value = allInvoices
        .filter((inv) => {
          const d = new Date(inv.date)
          return d >= monthStart && d <= monthEnd
        })
        .reduce((s, inv) => s + signedTtc(inv), 0)
      return { label, value }
    })
  }, [allInvoices, now])

  const chartMax = Math.max(...chartData.map((d) => d.value)) || 1

  const pipelineOrders = allOrders.filter((o) => {
    const d = new Date(o.date)
    return d >= rangeStart
  }).length
  const pipelineIssues = allIssues.filter((i) => {
    const d = new Date(i.date)
    return d >= rangeStart
  }).length
  const pipelineDeliveries = allDeliveries.filter((d) => {
    const dd = new Date(d.date)
    return dd >= rangeStart
  }).length
  const pipelineInvoices = filteredInvoices.length

  const lowStock = useMemo(
    () => articles.filter((a) => {
      if (a.type !== "product") return false
      const stock = castJson<Stock>(a.stock)
      return stock.onHand < stock.minStock
    }).slice(0, 6),
    [articles]
  )

  if (loading) return <div className="text-muted-foreground">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mode: {isTenant ? "Tenant (all orgs)" : `Organization — ${selectedOrgName ?? selectedOrgId}`}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm">Range</span>
          <div className="flex gap-1">
            {(["7", "30", "90", "ytd"] as Range[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
              >
                {r === "ytd" ? "YTD" : `${r}d`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-none border border-border/40 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue MTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTND(revenueMTD)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Money Out (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{formatTND(moneyOutMTD)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sales Trend</CardTitle>
            <CardDescription>Last 6 months TTC</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesBarChart
              data={chartData.map((d) => ({
                label: d.label,
                value: d.value,
                onClick: () => router.push("/dashboard/invoices"),
              }))}
              maxValue={chartMax}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-none border border-border/40 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTND(revenueToday)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTND(revenueYTD)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              In: {inCount} · Out: {outCount}
            </div>
            <Separator className="my-2" />
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/invoices")}>
              All Invoices
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxes Collected (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTND(taxesMTD)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">See invoice details</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none border border-border/40">
          <CardHeader>
            <CardTitle>Pipeline ({range === "ytd" ? "YTD" : `${range}d`})</CardTitle>
            <CardDescription>Order → Issue → Delivery → Invoice</CardDescription>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-4 gap-2">
            <div>Orders<div className="text-xl font-semibold">{pipelineOrders}</div></div>
            <div>Issues<div className="text-xl font-semibold">{pipelineIssues}</div></div>
            <div>Deliveries<div className="text-xl font-semibold">{pipelineDeliveries}</div></div>
            <div>Invoices<div className="text-xl font-semibold">{pipelineInvoices}</div></div>
          </CardContent>
        </Card>
        <Card className="shadow-none border border-border/40">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Below minimum stock</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length ? (
              <ul className="text-sm space-y-2">
                {lowStock.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <span>{a.code} — {a.designation}</span>
                    <span className="text-muted-foreground">
                      {castJson<Stock>(a.stock).onHand}/{castJson<Stock>(a.stock).minStock}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">
                No low stock —{" "}
                <button onClick={() => router.push("/dashboard/orders/create?type=supplier")} className="underline">
                  Create supplier order
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none border border-border/40">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Create documents</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => router.push("/dashboard/quotes/create")}>Create Quote</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/deliveries/create")}>Create Delivery</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/issues/create")}>Create Issue</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/orders/create?type=supplier")}>Create Supplier Order</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/contacts/add")}>Add Contact</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/articles/add")}>Add Article</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
