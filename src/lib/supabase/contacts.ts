import { createClient } from "@/lib/supabase/client"
import type { Contact, Organization } from "@/types/database"

// Logo, bank details and the stamp amount are set later on the edit screen,
// not at creation.
type NewOrganization = Omit<Organization, "id" | "tenant_id" | "created_at" | "logo_path" | "bank_details" | "stamp_duty">

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

export async function createContact(contact: Omit<Contact, "id" | "created_at" | "is_internal_org">): Promise<Contact> {
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

const LOGO_BUCKET = "organization-logos"

export async function updateOrganization(id: string, patch: Partial<Organization>): Promise<Organization> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Objects are keyed by organization id first, which is what the bucket's RLS
// policies match on (see supabase/17-organization-identity.sql).
export async function uploadOrganizationLogo(file: File, organizationId: string): Promise<string> {
  const supabase = createClient()
  const extension = file.name.split(".").pop()
  const filePath = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(filePath, file)
  if (error) throw error
  return filePath
}

export async function getOrganizationLogoUrl(filePath: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(filePath, 3600)
  if (error) throw error
  return data.signedUrl
}

// The PDF renderer embeds the logo rather than fetching it: a signed URL can
// expire or trip CORS mid-render, and a failed image aborts the whole document.
// Returns null on any failure so a missing logo never blocks an invoice.
export async function getOrganizationLogoDataUrl(filePath: string): Promise<string | null> {
  try {
    const signedUrl = await getOrganizationLogoUrl(filePath)
    const response = await fetch(signedUrl)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error("Failed to embed organization logo:", err)
    return null
  }
}

export async function deleteOrganizationLogo(filePath: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([filePath])
  if (error) throw error
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data
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
