"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserContext, type AppUser, type UserContextType } from "./user-context"
import type { Organization } from "@/types/database"

const EMPTY_USER: AppUser = { id: "", name: "", email: "", role: "", avatarUrl: undefined }

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(EMPTY_USER)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(EMPTY_USER)
      setOrganizations([])
      setLoading(false)
      return
    }

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

      setOrganizations((orgData as unknown as Organization[]) || [])
    } else {
      setOrganizations([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await loadUser()
        } else if (event === "SIGNED_OUT") {
          setUser(EMPTY_USER)
          setOrganizations([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUser])

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
