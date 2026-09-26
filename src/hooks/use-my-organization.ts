"use client"

import { useMemo } from "react"
import { useUser } from "@/contexts/user-context"
import { useContactsStore } from "@/contexts/contacts-store"
import type { Article, Contact } from "@/types/database"

export function useMyOrganization() {
  const { organizations } = useUser()
  const myOrgIds = useMemo(() => new Set(organizations.map((o) => o.id)), [organizations])

  const isContactMyOrganization = (c: Pick<Contact, "is_internal_org" | "internal_organization_id">) =>
    Boolean(c.is_internal_org && c.internal_organization_id && myOrgIds.has(c.internal_organization_id))

  const isArticleMyOrganization = (a: Pick<Article, "organization_id">) =>
    Boolean(a.organization_id && myOrgIds.has(a.organization_id))

  // Each organization has exactly one entry in the contacts list, created with
  // it (supabase/22-organization-contact-link.sql); this maps entry → organization.
  const { contacts } = useContactsStore()
  const organizationByContactId = useMemo(
    () => new Map(contacts.flatMap((c) => (c.internal_organization_id ? [[c.id, c.internal_organization_id] as const] : []))),
    [contacts]
  )

  // Interco is derived, never marked: a document is interco when its
  // counterparty is the entry of another of the caller's organizations. The
  // database only lets an entry belong to an organization of the contact's
  // own tenant, so a match is always within one group.
  const isInterco = (doc: { organization_id: string; counterparty_id: string | null }) => {
    if (!doc.counterparty_id) return false
    const counterpartyOrganization = organizationByContactId.get(doc.counterparty_id)
    return Boolean(
      counterpartyOrganization &&
      counterpartyOrganization !== doc.organization_id &&
      myOrgIds.has(counterpartyOrganization)
    )
  }

  return { myOrgIds, isContactMyOrganization, isArticleMyOrganization, isInterco }
}
