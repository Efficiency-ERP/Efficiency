"use client"

import * as React from "react"
import { useNavigation } from "@/contexts/navigation-context"
import { useSidebarPrefs } from "@/contexts/sidebar-prefs-context"
import { applySidebarOrder } from "@/hooks/use-sidebar-prefs"
import Link from "next/link"
import { useTheme } from "next-themes"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { navigationItems } = useNavigation()
  const { prefs } = useSidebarPrefs()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const [dashboardItem, ...restItems] = navigationItems
  const visibleItems = applySidebarOrder(restItems, prefs.order).filter((i) => !prefs.hidden.includes(i.url))
  const orderedNavigationItems = dashboardItem ? [dashboardItem, ...visibleItems] : visibleItems

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-medium">
          {mounted ? (
            <>
              <img
                src={resolvedTheme === "dark" ? "/logo_dark.svg" : "/logo.svg"}
                alt="Efficiency"
                className="h-6 w-32"
              />
              <span className="sr-only">Efficiency</span>
            </>
          ) : (
            <span className="text-lg font-bold">Efficiency</span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={orderedNavigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
