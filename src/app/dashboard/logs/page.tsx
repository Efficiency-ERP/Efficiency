"use client"

import { useLogs } from "@/contexts/logs-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LogsPage() {
  const { logs } = useLogs()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Logs</h1>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Module</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No logs yet</TableCell></TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString("fr-TN")}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell className="capitalize">{log.module}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
