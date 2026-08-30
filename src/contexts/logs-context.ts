import { createContext, useContext } from 'react'

export type LogEntry = {
  id: string
  timestamp: string
  userId: string
  userName: string
  module: 'invoices' | 'quotes' | 'contacts' | 'articles' | 'deliveries' | 'orders' | 'issues' | 'consignments' | 'settings' | 'pme'
  message: string
  targetId?: string
  organizationId?: string | null
}

export type LogsContextType = {
  logs: LogEntry[]
  addLog: (entry: LogEntry) => Promise<void>
}

export const LogsContext = createContext<LogsContextType | undefined>(undefined)

export function useLogs() {
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogs must be used within a LogsProvider')
  return ctx
}
