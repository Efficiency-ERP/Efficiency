"use client"

import { useState, useEffect, useMemo } from "react"
import { usePMESelection } from "@/contexts/pme-context"
import { useArticlesStore } from "@/contexts/articles-store"
import { getStockMovements } from "@/lib/supabase/stock"
import { getDeliveries } from "@/lib/supabase/invoices"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { StockMovement, Delivery } from "@/types/database"
import type { ColumnDef } from "@tanstack/react-table"

const SOURCE_ROUTES: Record<string, string> = {
  delivery: "/dashboard/deliveries",
}

export default function StockMovementsPage() {
  const router = useRouter()
  const { selectedOrgId } = usePMESelection()
  const { articles } = useArticlesStore()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [directionFilter, setDirectionFilter] = useState<string>("all")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const [moves, dels] = await Promise.all([getStockMovements(orgId), getDeliveries(orgId)])
        setMovements(moves)
        setDeliveries(dels)
      } catch (err) {
        console.error("Failed to load stock movements:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const articleById = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles])
  const deliveryById = useMemo(() => new Map(deliveries.map((d) => [d.id, d])), [deliveries])

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (directionFilter !== "all" && m.direction !== directionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const article = articleById.get(m.article_id)
        if (!article) return false
        if (!article.code.toLowerCase().includes(q) && !article.designation.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [movements, directionFilter, search, articleById])

  const columns: ColumnDef<StockMovement>[] = [
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "article_id",
      header: "Article",
      cell: ({ row }) => {
        const article = articleById.get(row.original.article_id)
        return article ? (
          <button onClick={() => router.push(`/dashboard/articles/${article.id}`)} className="underline hover:no-underline">
            {article.code} — {article.designation}
          </button>
        ) : "Unknown article"
      },
    },
    {
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }) => (
        <Badge variant={row.original.direction === "in" ? "default" : "secondary"}>
          {row.original.direction === "in" ? "In" : "Out"}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity_delta",
      header: "Quantity",
      cell: ({ row }) => {
        const qty = row.original.quantity_delta
        return <span className={qty < 0 ? "text-destructive" : "text-emerald-600"}>{qty > 0 ? `+${qty}` : qty}</span>
      },
    },
    {
      accessorKey: "source_type",
      header: "Source",
      cell: ({ row }) => {
        const { source_type, source_id } = row.original
        if (source_type === "delivery" && source_id) {
          const delivery = deliveryById.get(source_id)
          return (
            <button
              onClick={() => router.push(`${SOURCE_ROUTES[source_type]}/${source_id}`)}
              className="underline hover:no-underline"
            >
              {delivery ? delivery.number : "Delivery"}
            </button>
          )
        }
        return <span className="capitalize">{source_type}</span>
      },
    },
  ]

  if (loading) return <div className="text-muted-foreground">Loading stock movements...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Movements</h1>
      </div>
      <div className="flex gap-4">
        <Input placeholder="Search by article code or designation..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Directions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="in">In</SelectItem>
            <SelectItem value="out">Out</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={filteredMovements} />
    </div>
  )
}
