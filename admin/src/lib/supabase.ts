import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local")
}

export const supabase = createClient(url, key)

export type FeedbackType = "bug" | "feature" | "improvement"
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed"

export interface Feedback {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  type: FeedbackType
  description: string
  status: FeedbackStatus
  created_at: string
}

export interface FeedbackAttachment {
  id: string
  feedback_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  created_at: string
}

export async function fetchAllFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchAttachments(feedbackId: string): Promise<FeedbackAttachment[]> {
  const { data, error } = await supabase
    .from("feedback_attachments")
    .select("*")
    .eq("feedback_id", feedbackId)

  if (error) throw error
  return data || []
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus
): Promise<Feedback> {
  const { data, error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}
