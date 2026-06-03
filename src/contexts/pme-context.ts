import { createContext, useContext } from "react"

export type PMESelection = {
  selectedOrgId: string
  setSelectedOrgId: (id: string) => void
  selectedOrgName: string | null
}

export const PMEContext = createContext<PMESelection | null>(null)

export function usePMESelection() {
  const ctx = useContext(PMEContext)
  if (!ctx) throw new Error("usePMESelection must be used within a PMEProvider")
  return ctx
}
