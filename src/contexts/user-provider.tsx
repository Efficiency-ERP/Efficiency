"use client"

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient, resetClient } from "@/lib/supabase/client"
import { UserContext, type AppUser, type TenantMembership, type UserContextType } from "./user-context"
import type { Organization } from "@/types/database"

const EMPTY_USER: AppUser = { id: "", name: "", email: "", role: "", avatarUrl: undefined }

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(EMPTY_USER)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [tenants, setTenants] = useState<TenantMembership[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const loadIdRef = useRef(0)

  const loadUser = useCallback(async () => {
    const myId = ++loadIdRef.current
    try {
      const supabase = createClient()
      // getClaims verifies the JWT locally against a cached JWKS (the browser
      // client is a singleton, so the JWKS is fetched once per session). With
      // asymmetric JWT keys this avoids an Auth-server round-trip on every load.
      const { data: claimsData, error } = await supabase.auth.getClaims()
      const authUser = claimsData?.claims

      if (myId !== loadIdRef.current) return

      if (error || !authUser) {
        setUser(EMPTY_USER)
        setOrganizations([])
        setTenants([])
        setLoading(false)
        return
      }

      const authUserId = authUser.sub as string
      const authUserEmail = (authUser.email as string) || ""

      setUser({
        id: authUserId,
        name: authUserEmail,
        email: authUserEmail,
        role: "user",
        avatarUrl: undefined,
      })

      const [profileResult, orgMembersResult] = await Promise.all([
        supabase
          .from("profiles" as never)
          .select("*" as never)
          .eq("id", authUserId)
          .single(),
        supabase
          .from("user_tenants" as never)
          .select("tenant_id, role" as never)
          .eq("user_id", authUserId),
      ])

      if (myId !== loadIdRef.current) return

      const p = profileResult.data as Record<string, unknown> | null
      if (p) {
        setUser({
          id: p.id as string,
          name: (p.full_name as string) || authUserEmail,
          email: (p.email as string) || authUserEmail,
          role: (p.role as string) || "user",
          avatarUrl: (p.avatar_url as string) || undefined,
        })
      }

      // Joining a tenant grants access to every org under it, so we look
      // up organizations by tenant_id rather than a per-org membership list.
      const tenantMemberships = orgMembersResult.data as Array<{ tenant_id: string; role: string }> | null
      if (tenantMemberships && tenantMemberships.length > 0) {
        const tenantIds = tenantMemberships.map((ut) => ut.tenant_id)
        const [{ data: orgData }, { data: tenantData }] = await Promise.all([
          supabase
            .from("organizations" as never)
            .select("*" as never)
            .in("tenant_id", tenantIds),
          supabase
            .from("tenants" as never)
            .select("id, name" as never)
            .in("id", tenantIds),
        ])

        if (myId !== loadIdRef.current) return
        setOrganizations((orgData as unknown as Organization[]) || [])
        const names = new Map(((tenantData as unknown as Array<{ id: string; name: string }>) || []).map((t) => [t.id, t.name]))
        setTenants(tenantMemberships.map((ut) => ({
          id: ut.tenant_id,
          name: names.get(ut.tenant_id) || "",
          role: ut.role === "admin" ? "admin" : "member",
        })))
      } else {
        setOrganizations([])
        setTenants([])
      }
    } catch (err) {
      console.error("Failed to load user:", err)
      if (myId !== loadIdRef.current) return
      setUser(EMPTY_USER)
      setOrganizations([])
      setTenants([])
    } finally {
      if (myId === loadIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Defer the Supabase calls out of this callback. Calling auth/db
          // methods synchronously here deadlocks the supabase-js auth lock,
          // which leaves `loading` stuck on `true` forever after login.
          setTimeout(() => { loadUser() }, 0)
        } else if (event === "SIGNED_OUT") {
          loadIdRef.current++
          resetClient()
          setUser(EMPTY_USER)
          setOrganizations([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUser])

  useEffect(() => {
    if (loading) return
    if (!user.id && typeof window !== "undefined" && window.location.pathname !== "/login") {
      router.replace("/login")
    }
  }, [loading, user, router])

  const value = useMemo<UserContextType>(() => ({
    user,
    organizations,
    tenants,
    loading,
    addOrganization: (organization: Organization, tenant?: TenantMembership) => {
      setOrganizations((prev) => (prev.some((o) => o.id === organization.id) ? prev : [...prev, organization]))
      if (tenant) setTenants((prev) => (prev.some((t) => t.id === tenant.id) ? prev : [...prev, tenant]))
    },
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
  }), [user, organizations, tenants, loading])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
