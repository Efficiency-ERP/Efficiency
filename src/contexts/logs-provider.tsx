"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { LogsContext, type LogsContextType, type LogEntry } from "./logs-context"
import { getLogs, createLog } from "@/lib/supabase/logs"
import { usePMESelection } from "@/contexts/pme-context"

export function LogsProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const { selectedOrgId } = usePMESelection()

  useEffect(() => {
    async function load() {
      try {
        const orgId = selectedOrgId !== "all" ? selectedOrgId : undefined
        const data = await getLogs(orgId)
        setLogs(data.map((l) => ({
          id: l.id,
          timestamp: l.created_at,
          userId: l.user_id || "",
          userName: l.user_name || "System",
          module: l.module as LogEntry["module"],
          message: l.message,
          targetId: l.target_id || undefined,
        })))
      } catch {
        // Logs may fail on first run before RLS is fully set up
      }
    }
    load()
  }, [selectedOrgId])

  const addLog = useCallback(async (entry: LogEntry) => {
    setLogs((prev) => [entry, ...prev])
    try {
      await createLog({
        user_id: entry.userId || null,
        user_name: entry.userName,
        module: entry.module,
        message: entry.message,
        target_id: entry.targetId || null,
        organization_id: entry.organizationId !== undefined ? entry.organizationId : (selectedOrgId !== "all" ? selectedOrgId : null),
      })
    } catch {
      // Silent fail for logs
    }
  }, [selectedOrgId])

  const value = useMemo<LogsContextType>(() => ({
    logs,
    addLog,
  }), [logs, addLog])

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>
}
