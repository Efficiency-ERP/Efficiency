"use client"

import { useMemo } from "react"
import { useUser } from "@/contexts/user-context"
import type { Article, Contact } from "@/types/database"

export function useMyPme() {
  const { organizations } = useUser()
  const myOrgIds = useMemo(() => new Set(organizations.map((o) => o.id)), [organizations])

  const isContactMyPme = (c: Pick<Contact, "is_internal_org" | "internal_organization_id">) =>
    Boolean(c.is_internal_org && c.internal_organization_id && myOrgIds.has(c.internal_organization_id))

  const isArticleMyPme = (a: Pick<Article, "organization_id">) =>
    Boolean(a.organization_id && myOrgIds.has(a.organization_id))

  return { myOrgIds, isContactMyPme, isArticleMyPme }
}
