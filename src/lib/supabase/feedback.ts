import { createClient } from "@/lib/supabase/client"

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

export async function createFeedback(
  feedback: Omit<Feedback, "id" | "created_at" | "status">,
  attachments?: { file_name: string; file_url: string; file_type: string; file_size: number }[]
): Promise<Feedback> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("feedback")
    .insert(feedback)
    .select()
    .single()

  if (error) throw error

  if (attachments && attachments.length > 0) {
    const { error: attachError } = await supabase
      .from("feedback_attachments")
      .insert(
        attachments.map((a) => ({
          feedback_id: data.id,
          ...a,
        }))
      )

    if (attachError) throw attachError
  }

  return data
}

export async function uploadFeedbackAttachment(
  file: File,
  userId: string
): Promise<{ file_name: string; file_url: string; file_type: string; file_size: number }> {
  const supabase = createClient()
  const fileExt = file.name.split(".").pop()
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  const { error } = await supabase.storage
    .from("feedback-attachments")
    .upload(filePath, file)

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from("feedback-attachments")
    .getPublicUrl(filePath)

  return {
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_type: file.type,
    file_size: file.size,
  }
}

export async function getFeedback(): Promise<Feedback[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getFeedbackAttachments(feedbackId: string): Promise<FeedbackAttachment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("feedback_attachments")
    .select("*")
    .eq("feedback_id", feedbackId)

  if (error) throw error
  return data || []
}
