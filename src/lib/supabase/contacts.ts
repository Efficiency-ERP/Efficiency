import { createClient } from "@/lib/supabase/client"
import type { Contact, Organization } from "@/types/database"

type NewOrganization = Omit<Organization, "id" | "tenant_id" | "created_at">

export async function getContacts(organizationId?: string): Promise<Contact[]> {
  const supabase = createClient()
  let query = supabase
    .from("contacts")
    .select("*")
    .eq("archived", false)
    .order("company_name")

  if (organizationId) {
    query = query.or(
      `is_internal_org.eq.false,internal_organization_id.eq.${organizationId}`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getContact(id: string): Promise<Contact | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createContact(contact: Omit<Contact, "id" | "created_at">): Promise<Contact> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contacts")
    .insert(contact)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveContact(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("contacts")
    .update({ archived: true })
    .eq("id", id)

  if (error) throw error
}

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name")

  if (error) throw error
  return data || []
}

// Stands up a brand-new tenant (one org under it, run by its creator as
// admin) — the only entry point today, since there's no UI yet for adding
// a second org to an existing tenant. Order matters: the tenant and the
// creator's membership must exist before the org insert, since the org's
// own RLS policy requires the caller to already belong to its tenant_id.
export async function createOrganization(org: NewOrganization): Promise<Organization> {
  const supabase = createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: org.name })
    .select()
    .single()
  if (tenantError) throw tenantError

  const { error: membershipError } = await supabase
    .from("user_tenants")
    .insert({ user_id: userData.user.id, tenant_id: tenant.id, role: "admin" })
  if (membershipError) throw membershipError

  const { data, error } = await supabase
    .from("organizations")
    .insert({ ...org, tenant_id: tenant.id })
    .select()
    .single()
  if (error) throw error

  return data
}
