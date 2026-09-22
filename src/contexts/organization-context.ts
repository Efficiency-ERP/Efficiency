import { createContext, useContext } from "react"

export type OrganizationSelection = {
  selectedOrgId: string
  setSelectedOrgId: (id: string) => void
  selectedOrgName: string | null
}

export const OrganizationContext = createContext<OrganizationSelection | null>(null)

export function useOrganizationSelection() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error("useOrganizationSelection must be used within an OrganizationProvider")
  return ctx
}
