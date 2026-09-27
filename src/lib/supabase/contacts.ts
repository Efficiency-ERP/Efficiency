import { createClient } from "@/lib/supabase/client"
import type { Contact, Organization } from "@/types/database"

// Logo, bank details and the stamp amount are set later on the edit screen,
// not at creation.
type NewOrganization = Omit<Organization, "id" | "tenant_id" | "created_at" | "logo_path" | "bank_details" | "stamp_duty">

// Every contact of the caller's tenants. Deciding which ones an organization
// may trade with (not its own entry) is the caller's job.
export async function getContacts(): Promise<Contact[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("archived", false)
    .order("company_name")
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

// Creates an organization and its internal contact in one transaction, through
// create_organization (supabase/21-organizations-in-tenant.sql). With a tenant
// id it joins that group — admins only, as the database enforces. With null it
// is first-time onboarding: a new group with the caller as its admin, which
// the database allows only for someone who belongs to no group yet.
//
// This cannot be done as client-side inserts: reading a new tenant or a new
// organization back in the same statement fails its SELECT policy.
export async function createOrganization(
  org: NewOrganization,
  tenantId: string | null
): Promise<{ organization: Organization; contact: Contact }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("create_organization", {
    p_tenant_id: tenantId,
    p_org: org,
  })
  if (error) throw error
  return data as { organization: Organization; contact: Contact }
}
