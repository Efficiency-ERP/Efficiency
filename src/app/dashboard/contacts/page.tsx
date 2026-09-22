"use client"

import { useState, useMemo } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { useOrganizationSelection } from "@/contexts/organization-context"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { partyTypeSuggestions } from "@/components/party-type-field"
import type { Contact } from "@/types/database"
import type { ColumnDef } from "@tanstack/react-table"

export default function ListContactsPage() {
  const router = useRouter()
  const { contacts, loading } = useContactsStore()
  const { selectedOrgId } = useOrganizationSelection()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const customTypes = useMemo(() => partyTypeSuggestions(contacts), [contacts])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.company_name.toLowerCase().includes(q) &&
          !c.mf?.toLowerCase().includes(q) &&
          !c.unique_id?.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      // Type filter
      if (typeFilter !== "all" && c.party_type !== typeFilter) {
        return false
      }
      // Organization filter
      if (selectedOrgId !== "all") {
        if (c.is_internal_org && c.internal_organization_id !== selectedOrgId) return false
      }
      return true
    })
  }, [contacts, search, typeFilter, selectedOrgId])

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "company_name",
      header: "Raison sociale",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/contacts/${row.original.id}`)}
            className="underline hover:no-underline"
          >
            {row.original.company_name}
          </button>
          {row.original.is_internal_org && <Badge variant="secondary">Interne</Badge>}
        </div>
      ),
    },
    {
      accessorKey: "mf",
      header: "MF",
    },
    {
      accessorKey: "unique_id",
      header: "Identifiant unique",
    },
    {
      id: "phone",
      header: "Téléphone",
      cell: ({ row }) => (row.original.contact as { phone?: string })?.phone || "-",
    },
    {
      id: "fax",
      header: "Fax",
      cell: ({ row }) => (row.original.contact as { fax?: string })?.fax || "-",
    },
    {
      accessorKey: "address",
      header: "Ville",
      cell: ({ row }) => (row.original.address as { city?: string })?.city || "-",
    },
    {
      accessorKey: "party_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.party_type === "customer" ? "default" : row.original.party_type === "supplier" ? "secondary" : "outline"}>
          {row.original.party_type}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return <div className="text-muted-foreground">Chargement des contacts...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => router.push("/dashboard/contacts/add")}>Ajouter un contact</Button>
      </div>
      <div className="flex gap-4">
        <Input
          placeholder="Rechercher par nom, MF ou identifiant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="customer">Client</SelectItem>
            <SelectItem value="supplier">Fournisseur</SelectItem>
            <SelectItem value="both">Les deux</SelectItem>
            {customTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={filteredContacts} filterColumn="company_name" filterPlaceholder="Filter contacts..." />
    </div>
  )
}
