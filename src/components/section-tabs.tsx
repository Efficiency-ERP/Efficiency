"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export interface SectionTab {
  label: string
  href: string
}

// A row of links styled as tabs, switching between the sibling pages that
// make up one sidebar section (e.g. Sales: Quotes/Deliveries/Consignments).
// Plain navigation, not client-side panel state — each tab is a real route,
// so pages stay independently linkable and keep their own logic untouched.
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex gap-1 border-b mb-4">
      {tabs.map((tab) => {
        const [tabPath, tabQuery] = tab.href.split("?")
        const pathMatches = pathname === tabPath || pathname.startsWith(tabPath + "/")
        const queryMatches = !tabQuery || new URLSearchParams(tabQuery).get("side") === searchParams.get("side")
        const isActive = pathMatches && queryMatches
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
