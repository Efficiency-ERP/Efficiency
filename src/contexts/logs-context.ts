import { createContext, useContext } from 'react'

export type LogEntry = {
  id: string
  timestamp: string
  userId: string
  userName: string
  module: 'invoices' | 'contacts' | 'articles' | 'deliveries' | 'orders' | 'issues' | 'settings'
  message: string
  targetId?: string
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
