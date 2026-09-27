import type { SectionTab } from "@/components/section-tabs"

export const SALES_TABS: SectionTab[] = [
  { label: "Devis", href: "/dashboard/quotes" },
  { label: "Bons de livraison", href: "/dashboard/deliveries" },
  { label: "Consignations", href: "/dashboard/consignments?side=sale" },
]

export const PURCHASING_TABS: SectionTab[] = [
  { label: "Commandes", href: "/dashboard/orders" },
  { label: "Consignations", href: "/dashboard/consignments?side=purchase" },
]

export const ARTICLES_TABS: SectionTab[] = [
  { label: "Articles", href: "/dashboard/articles" },
  { label: "Stock", href: "/dashboard/stock" },
  { label: "Entrées / Sorties", href: "/dashboard/issues" },
]
