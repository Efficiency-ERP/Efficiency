"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useContactsStore } from "@/contexts/contacts-store"
import { useOrganizationSelection } from "@/contexts/organization-context"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/use-sidebar"

type OrganizationItem = {
  id: string
  name: string
  icon: React.ElementType
  type: "organization" | "view"
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { organizations } = useContactsStore()
  const { selectedOrgId, setSelectedOrgId } = useOrganizationSelection()
  const router = useRouter()

  const handleAddOrganization = () => {
    router.push("/dashboard/organizations/add")
  }

  const items: OrganizationItem[] = React.useMemo(() => {
    const base: OrganizationItem[] = [{ id: "all", name: "Toutes les organisations", icon: Eye, type: "view" }]
    const orgs = organizations.map((o) => ({ id: o.id, name: o.name, icon: Building2, type: "organization" as const }))
    return [...base, ...orgs]
  }, [organizations])

  const activeOrganization = React.useMemo(() => {
    if (selectedOrgId === "all") return items[0]
    const found = items.find((i) => i.id === selectedOrgId)
    return found ?? items[0]
  }, [items, selectedOrgId])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeOrganization.icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrganization.name}</span>
                <span className="truncate text-xs">{activeOrganization.type === "view" ? "Vue d'ensemble" : "Organisation"}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Sélecteur d'organisation
            </DropdownMenuLabel>
            {items.map((organization, index) => (
              <DropdownMenuItem
                key={organization.id}
                onClick={() => setSelectedOrgId(organization.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <organization.icon className="size-3.5 shrink-0" />
                </div>
                {organization.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleAddOrganization}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Ajouter une organisation</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
