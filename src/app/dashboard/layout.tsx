import { redirect } from "next/navigation"
import { createServerClientInstance } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard-shell"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The proxy already revalidates/refreshes the session for every dashboard
  // request, so this is a cheap, local defense-in-depth check (getClaims verifies
  // the JWT against a cached JWKS) rather than a second Auth-server round-trip.
  const supabase = await createServerClientInstance()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect("/login")
  }

  return <DashboardShell>{children}</DashboardShell>
}
