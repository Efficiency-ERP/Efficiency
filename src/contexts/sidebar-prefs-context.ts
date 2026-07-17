import { createContext, useContext } from "react"
import type { SidebarPrefs } from "@/hooks/use-sidebar-prefs"

export type SidebarPrefsContextType = {
  prefs: SidebarPrefs
  loaded: boolean
  toggleHidden: (url: string) => void
  move: (effectiveOrder: string[], url: string, direction: -1 | 1) => void
  reset: () => void
}

export const SidebarPrefsContext = createContext<SidebarPrefsContextType | undefined>(undefined)

export function useSidebarPrefs() {
  const ctx = useContext(SidebarPrefsContext)
  if (!ctx) throw new Error("useSidebarPrefs must be used within a SidebarPrefsProvider")
  return ctx
}
