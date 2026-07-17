"use client"

import { useCallback } from "react"
import { useLogs } from "@/contexts/logs-context"
import { useUser } from "@/contexts/user-context"
import type { LogEntry } from "@/contexts/logs-context"

export function useActionLog(module: LogEntry["module"]) {
  const { addLog } = useLogs()
  const { user } = useUser()

  return useCallback((message: string, targetId?: string, organizationId?: string | null) => {
    return addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name || user.email || "Unknown",
      module,
      message,
      targetId,
      organizationId,
    })
  }, [addLog, user, module])
}
