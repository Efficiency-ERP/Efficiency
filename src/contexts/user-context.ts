import { createContext, useContext } from 'react'
import type { Organization } from '@/types/database'

export type AppUser = { id: string; name: string; email: string; role: string; avatarUrl?: string }

export type UserContextType = {
  user: AppUser
  organizations: Organization[]
  loading: boolean
  updateUser: (patch: Partial<AppUser>) => Promise<void>
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
