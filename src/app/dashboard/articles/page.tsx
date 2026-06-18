"use client"

import { useState, useMemo } from "react"
import { useArticlesStore } from "@/contexts/articles-store"
import { usePMESelection } from "@/contexts/pme-context"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { Article, Stock, Consignment } from "@/types/database"
import type { ColumnDef } from "@tanstack/react-table"
import { castJson } from "@/lib/utils"

export default function ListArticlesPage() {
  const router = useRouter()
  const { articles, loading } = useArticlesStore()
  const { selectedOrgId } = usePMESelection()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [consignmentFilter, setConsignmentFilter] = useState<string>("all")

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (search) {
        const q = search.toLowerCase()
        if (!a.code.toLowerCase().includes(q) && !a.designation.toLowerCase().includes(q)) return false
      }
      if (typeFilter !== "all" && a.type !== typeFilter) return false
      if (consignmentFilter !== "all") {
        const hasConsignment = (a.consignment as { enabled: boolean })?.enabled
        if (consignmentFilter === "yes" && !hasConsignment) return false
        if (consignmentFilter === "no" && hasConsignment) return false
      }
      if (selectedOrgId !== "all" && a.organization_id !== selectedOrgId) return false
      return true
    })
  }, [articles, search, typeFilter, consignmentFilter, selectedOrgId])

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <button onClick={() => router.push(`/dashboard/articles/${row.original.id}`)} className="underline hover:no-underline">
          {row.original.code}
        </button>
      ),
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.designation}
          <Badge variant="outline">{row.original.type}</Badge>
        </div>
      ),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit || "-",
    },
    {
      accessorKey: "unit_price_puht",
      header: "PUHT",
      cell: ({ row }) => `${row.original.unit_price_puht} TND`,
    },
    {
      accessorKey: "transfer_price",
      header: "Transfer",
      cell: ({ row }) => `${row.original.transfer_price} TND`,
    },
    {
      accessorKey: "vat_rate",
      header: "TVA %",
    },
    {
      accessorKey: "dc_rate",
      header: "DC %",
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = castJson<Stock>(row.original.stock)
        return `${stock.onHand} / ${stock.minStock}`
      },
    },
    {
      accessorKey: "consignment",
      header: "Consign.",
      cell: ({ row }) => {
        const consignment = castJson<Consignment>(row.original.consignment)
        return consignment.enabled ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>
      },
    },
  ]

  if (loading) return <div className="text-muted-foreground">Loading articles...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        <Button onClick={() => router.push("/dashboard/articles/add")}>Add Article</Button>
      </div>
      <div className="flex gap-4">
        <Input placeholder="Search by code or designation..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product">Produit</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={consignmentFilter} onValueChange={setConsignmentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Consign." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Oui</SelectItem>
            <SelectItem value="no">Non</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={filteredArticles} filterColumn="code" filterPlaceholder="Filter articles..." />
    </div>
  )
}
