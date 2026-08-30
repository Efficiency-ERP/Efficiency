import { redirect } from "next/navigation"

// The sidebar links here; the section itself has no content of its own —
// it lands on its first tab (Quotes), same as clicking that tab directly.
export default function SalesSectionPage() {
  redirect("/dashboard/quotes")
}
