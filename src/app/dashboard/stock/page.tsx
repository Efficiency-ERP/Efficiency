"use client"

import { useState, useEffect, useMemo } from "react"
import { useOrganizationSelection } from "@/contexts/organization-context"
import { useArticlesStore } from "@/contexts/articles-store"
import { getStockMovements } from "@/lib/supabase/stock"
import { getDeliveries, getInvoices, getIssues } from "@/lib/supabase/invoices"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { StockMovement, StockMovementSourceType } from "@/types/database"
import type { ColumnDef } from "@tanstack/react-table"
import { SectionTabs } from "@/components/section-tabs"
import { ARTICLES_TABS } from "@/lib/section-tabs-config"

// Where each kind of movement links to. An adjustment is a manual correction
// on the article form and has no document behind it.
const SOURCE_ROUTES: Partial<Record<StockMovementSourceType, string>> = {
  invoice: "/dashboard/invoices",
  issue: "/dashboard/issues",
  delivery: "/dashboard/deliveries",
}

const SOURCE_LABELS: Record<StockMovementSourceType, string> = {
  invoice: "Facture",
  issue: "Bon de sortie",
  delivery: "Bon de livraison",
  adjustment: "Ajustement",
}

export default function StockMovementsPage() {
  const router = useRouter()
  const { selectedOrgId } = useOrganizationSelection()
  const { articles } = useArticlesStore()
  const [movements, setMovements] = useState<StockMovement[]>([])
  // Document numbers by id, across every table a movement can point at.
  const [numberById, setNumberById] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [directionFilter, setDirectionFilter] = useState<string>("all")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const [moves, invoices, issues, deliveries] = await Promise.all([
          getStockMovements(orgId),
          getInvoices(orgId),
          getIssues(orgId),
          getDeliveries(orgId),
        ])
        setMovements(moves)
        setNumberById(new Map([...invoices, ...issues, ...deliveries].map((d) => [d.id, d.number])))
      } catch (err) {
        console.error("Failed to load stock movements:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedOrgId])

  const articleById = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles])

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
        ) : "Article inconnu"
      },
    },
    {
      accessorKey: "direction",
      header: "Sens",
      cell: ({ row }) => (
        <Badge variant={row.original.direction === "in" ? "default" : "secondary"}>
          {row.original.direction === "in" ? "Entrée" : "Sortie"}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity_delta",
      header: "Quantité",
      cell: ({ row }) => {
        const qty = row.original.quantity_delta
        return <span className={qty < 0 ? "text-destructive" : "text-emerald-600"}>{qty > 0 ? `+${qty}` : qty}</span>
      },
    },
    {
      accessorKey: "source_type",
      header: "Source",
      cell: ({ row }) => {
        const { source_type, source_document_id, source_issue_id } = row.original
        const label = SOURCE_LABELS[source_type] ?? source_type
        const sourceId = source_issue_id ?? source_document_id
        const route = SOURCE_ROUTES[source_type]
        if (sourceId && route) {
          const number = numberById.get(sourceId)
          return (
            <button onClick={() => router.push(`${route}/${sourceId}`)} className="underline hover:no-underline">
              {number ? `${label} ${number}` : label}
            </button>
          )
        }
        return <span>{label}</span>
      },
    },
  ]

  return (
    <div className="space-y-4">
      <SectionTabs tabs={ARTICLES_TABS} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mouvements de stock</h1>
      </div>
      {loading ? (
        <div className="text-muted-foreground">Chargement des mouvements de stock...</div>
      ) : (
        <>
          <div className="flex gap-4">
            <Input placeholder="Rechercher par code article ou désignation..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tous les sens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sens</SelectItem>
                <SelectItem value="in">Entrée</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filteredMovements} />
        </>
      )}
    </div>
  )
}
