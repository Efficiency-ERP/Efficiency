"use client"

import React, { useMemo, useState } from "react"
import { PMEContext, type PMESelection } from "./pme-context"
import type { Organization } from "@/types/database"

export function PMEProvider({ children, organizations }: { children: React.ReactNode; organizations: Organization[] }) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")

  const selectedOrgName = useMemo(() => {
    if (selectedOrgId === "all") return null
    const org = organizations.find((o) => o.id === selectedOrgId)
    return org ? org.name : null
  }, [selectedOrgId, organizations])

  const value: PMESelection = {
    selectedOrgId,
    setSelectedOrgId,
    selectedOrgName,
  }

  return <PMEContext.Provider value={value}>{children}</PMEContext.Provider>
}
