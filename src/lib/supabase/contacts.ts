import { createClient } from "@/lib/supabase/client"
import type { Contact, Organization } from "@/types/database"

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

export async function createOrganization(org: Omit<Organization, "id" | "created_at">): Promise<Organization> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("organizations")
    .insert(org)
    .select()
    .single()

  if (error) throw error
  return data
}
