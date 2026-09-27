"use client"

import React, { useMemo, useState } from "react"
import { OrganizationContext, type OrganizationSelection } from "./organization-context"
import type { Organization } from "@/types/database"

export function OrganizationProvider({ children, organizations }: { children: React.ReactNode; organizations: Organization[] }) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")

  const selectedOrgName = useMemo(() => {
    if (selectedOrgId === "all") return null
    const org = organizations.find((o) => o.id === selectedOrgId)
    return org ? org.name : null
  }, [selectedOrgId, organizations])

  const value: OrganizationSelection = {
    selectedOrgId,
    setSelectedOrgId,
    selectedOrgName,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}
