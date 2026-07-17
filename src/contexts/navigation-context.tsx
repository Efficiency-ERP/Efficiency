"use client"

import React, { createContext, useContext } from "react"
import { Home, FileText, Users, Newspaper, Boxes, Truck, ShoppingCart, ClipboardList } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavigationItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: { title: string; url: string }[]
}

export interface NavigationContextType {
  navigationItems: NavigationItem[]
  getNavigationByPath: (path: string) => NavigationItem | null
  getBreadcrumbsForPath: (path: string) => Array<{ label: string; href: string; isLast: boolean }>
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Invoices",
    url: "/dashboard/invoices",
    icon: FileText,
  },
  {
    title: "Contacts",
    url: "/dashboard/contacts",
    icon: Users,
  },
  {
    title: "Articles",
    url: "/dashboard/articles",
    icon: Newspaper,
  },
  {
    title: "Stock",
    url: "/dashboard/stock",
    icon: Boxes,
  },
  {
    title: "Deliveries",
    url: "/dashboard/deliveries",
    icon: Truck,
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    title: "Issues",
    url: "/dashboard/issues",
    icon: ClipboardList,
  },
]

function findNavigationItem(items: NavigationItem[], path: string): NavigationItem | null {
  for (const item of items) {
    if (item.url === path) {
      return item
    }
    if (item.items) {
      const subMatch = item.items.find((sub) => sub.url === path)
      if (subMatch) {
        return { title: subMatch.title, url: subMatch.url }
      }
    }
  }
  return null
}

function generateBreadcrumbs(path: string): Array<{ label: string; href: string; isLast: boolean }> {
  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard", isLast: false }
  ]

  if (path === "/dashboard") {
    breadcrumbs[0].isLast = true
    return breadcrumbs
  }

  const pathSegments = path.split("/").filter(Boolean)

  if (pathSegments.includes("invoices")) {
    breadcrumbs.push({ label: "Invoices", href: "/dashboard/invoices", isLast: true })
  } else if (pathSegments.includes("contacts")) {
    breadcrumbs.push({ label: "Contacts", href: "/dashboard/contacts", isLast: true })
  } else if (pathSegments.includes("articles")) {
    breadcrumbs.push({ label: "Articles", href: "/dashboard/articles", isLast: true })
  } else if (pathSegments.includes("stock")) {
    breadcrumbs.push({ label: "Stock", href: "/dashboard/stock", isLast: true })
  } else if (pathSegments.includes("deliveries")) {
    breadcrumbs.push({ label: "Deliveries", href: "/dashboard/deliveries", isLast: true })
  } else if (pathSegments.includes("orders")) {
    breadcrumbs.push({ label: "Orders", href: "/dashboard/orders", isLast: true })
  } else if (pathSegments.includes("issues")) {
    breadcrumbs.push({ label: "Issues", href: "/dashboard/issues", isLast: true })
  } else if (pathSegments.includes("profile")) {
    breadcrumbs.push({ label: "Profile", href: "/dashboard/profile", isLast: true })
  } else if (pathSegments.includes("pme")) {
    const isAdd = pathSegments.includes("add")
    breadcrumbs.push({ label: "PME", href: "/dashboard/pme", isLast: !isAdd })
    if (isAdd) {
      breadcrumbs.push({ label: "Add PME", href: "/dashboard/pme/add", isLast: true })
    }
  } else if (pathSegments.includes("settings")) {
    breadcrumbs.push({ label: "Settings", href: "/dashboard/settings", isLast: true })
  } else if (pathSegments.includes("logs")) {
    breadcrumbs.push({ label: "Logs", href: "/dashboard/logs", isLast: true })
  }

  return breadcrumbs
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const getNavigationByPath = (path: string): NavigationItem | null => {
    return findNavigationItem(navigationItems, path)
  }

  const getBreadcrumbsForPath = (path: string) => {
    return generateBreadcrumbs(path)
  }

  const value: NavigationContextType = {
    navigationItems,
    getNavigationByPath,
    getBreadcrumbsForPath,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
