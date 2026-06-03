import { createClient } from "@/lib/supabase/client"
import type { Log } from "@/types/database"

export async function getLogs(organizationId?: string): Promise<Log[]> {
  const supabase = createClient()
  let query = supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createLog(log: Omit<Log, "id" | "created_at">): Promise<Log> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("logs")
    .insert(log)
    .select()
    .single()

  if (error) throw error
  return data
}
