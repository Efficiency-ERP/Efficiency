import { createContext, useContext } from 'react'
import type { Organization } from '@/types/database'

export type AppUser = { id: string; name: string; email: string; role: string; avatarUrl?: string }

// A group of organizations the user belongs to, and what they may do in it.
// Only an admin can add an organization to the group.
export type TenantMembership = { id: string; name: string; role: "admin" | "member" }

export type UserContextType = {
  user: AppUser
  organizations: Organization[]
  tenants: TenantMembership[]
  loading: boolean
  updateUser: (patch: Partial<AppUser>) => Promise<void>
  // Makes a newly created organization (and, at onboarding, its new group)
  // visible at once, without waiting for the next full load.
  addOrganization: (organization: Organization, tenant?: TenantMembership) => void
}

// An admin may add an organization to their group. Someone with no group yet
// may add their first one, which creates the group. The database enforces the
// same rule (create_organization); this only keeps the UI from offering it.
export function canAddOrganization(tenants: TenantMembership[]): boolean {
  return tenants.length === 0 || tenants.some((t) => t.role === "admin")
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
