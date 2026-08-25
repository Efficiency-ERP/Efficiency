import type { SectionTab } from "@/components/section-tabs"

export const SALES_TABS: SectionTab[] = [
  { label: "Quotes", href: "/dashboard/quotes" },
  { label: "Deliveries", href: "/dashboard/deliveries" },
  { label: "Consignments", href: "/dashboard/consignments?side=sale" },
]

export const PURCHASING_TABS: SectionTab[] = [
  { label: "Orders", href: "/dashboard/orders" },
  { label: "Consignments", href: "/dashboard/consignments?side=purchase" },
]

export const ARTICLES_TABS: SectionTab[] = [
  { label: "Articles", href: "/dashboard/articles" },
  { label: "Stock", href: "/dashboard/stock" },
  { label: "Issues", href: "/dashboard/issues" },
]
