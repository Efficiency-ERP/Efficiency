"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useContactsStore } from "@/contexts/contacts-store"
import { usePMESelection } from "@/contexts/pme-context"

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

type PMEItem = {
  id: string
  name: string
  icon: React.ElementType
  type: "pme" | "view"
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { organizations } = useContactsStore()
  const { selectedOrgId, setSelectedOrgId } = usePMESelection()
  const router = useRouter()

  const handleAddPME = () => {
    router.push("/dashboard/pme/add")
  }

  const items: PMEItem[] = React.useMemo(() => {
    const base: PMEItem[] = [{ id: "all", name: "All PMEs", icon: Eye, type: "view" }]
    const orgs = organizations.map((o) => ({ id: o.id, name: o.name, icon: Building2, type: "pme" as const }))
    return [...base, ...orgs]
  }, [organizations])

  const activePME = React.useMemo(() => {
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
                <activePME.icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activePME.name}</span>
                <span className="truncate text-xs">{activePME.type === "view" ? "Overview" : "PME Unit"}</span>
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
              PME Selector
            </DropdownMenuLabel>
            {items.map((pme, index) => (
              <DropdownMenuItem
                key={pme.id}
                onClick={() => setSelectedOrgId(pme.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <pme.icon className="size-3.5 shrink-0" />
                </div>
                {pme.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleAddPME}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add PME</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
