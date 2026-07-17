"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { SidebarPrefsContext, type SidebarPrefsContextType } from "./sidebar-prefs-context"
import {
  DEFAULT_SIDEBAR_PREFS,
  SIDEBAR_PREFS_STORAGE_KEY,
  readSidebarPrefs,
  type SidebarPrefs,
} from "@/hooks/use-sidebar-prefs"

export function SidebarPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<SidebarPrefs>(DEFAULT_SIDEBAR_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(readSidebarPrefs())
    setLoaded(true)
  }, [])

  const persist = useCallback((next: SidebarPrefs) => {
    setPrefs(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_PREFS_STORAGE_KEY, JSON.stringify(next))
    }
  }, [])

  const toggleHidden = useCallback((url: string) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        hidden: prev.hidden.includes(url) ? prev.hidden.filter((u) => u !== url) : [...prev.hidden, url],
      }
      if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_PREFS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Moves `url` by `direction` within the given effective order (full list, hidden included).
  const move = useCallback((effectiveOrder: string[], url: string, direction: -1 | 1) => {
    setPrefs((prev) => {
      const index = effectiveOrder.indexOf(url)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= effectiveOrder.length) return prev
      const nextOrder = [...effectiveOrder]
      ;[nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]]
      const next = { ...prev, order: nextOrder }
      if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_PREFS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    persist(DEFAULT_SIDEBAR_PREFS)
  }, [persist])

  const value = useMemo<SidebarPrefsContextType>(() => ({
    prefs,
    loaded,
    toggleHidden,
    move,
    reset,
  }), [prefs, loaded, toggleHidden, move, reset])

  return <SidebarPrefsContext.Provider value={value}>{children}</SidebarPrefsContext.Provider>
}
