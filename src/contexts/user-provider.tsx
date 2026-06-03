"use client"

import React, { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserContext, type AppUser, type UserContextType } from "./user-context"
import type { Organization } from "@/types/database"

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>({ id: "", name: "", email: "", role: "", avatarUrl: undefined })
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: authResult } = await supabase.auth.getUser()
      const authUser = authResult.user

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles" as never)
          .select("*" as never)
          .eq("id", authUser.id)
          .single()

        const p = profile as Record<string, unknown> | null

        if (p) {
          setUser({
            id: p.id as string,
            name: (p.full_name as string) || authUser.email || "",
            email: (p.email as string) || authUser.email || "",
            role: (p.role as string) || "user",
            avatarUrl: (p.avatar_url as string) || undefined,
          })
        } else {
          setUser({
            id: authUser.id,
            name: authUser.email || "",
            email: authUser.email || "",
            role: "user",
            avatarUrl: undefined,
          })
        }

        // Load user's organizations via junction table
        const { data: userOrgs } = await supabase
          .from("user_organizations" as never)
          .select("organization_id" as never)
          .eq("user_id", authUser.id)

        const orgs = userOrgs as Array<{ organization_id: string }> | null

        if (orgs && orgs.length > 0) {
          const orgIds = orgs.map((uo) => uo.organization_id)
          const { data: orgData } = await supabase
            .from("organizations" as never)
            .select("*" as never)
            .in("id", orgIds)

          if (orgData) setOrganizations(orgData as unknown as Organization[])
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const value = useMemo<UserContextType>(() => ({
    user,
    organizations,
    loading,
    updateUser: async (patch: Partial<AppUser>) => {
      setUser((prev) => ({ ...prev, ...patch }))
      if (patch.name || patch.role || patch.avatarUrl) {
        const supabase = createClient()
        await supabase.from("profiles" as never).update({
          full_name: patch.name,
          role: patch.role,
          avatar_url: patch.avatarUrl,
        } as never).eq("id", user.id)
      }
    },
  }), [user, organizations, loading])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
