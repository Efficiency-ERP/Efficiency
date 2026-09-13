import { createClient } from "@/lib/supabase/client"

export type DocumentType = "invoice" | "order"
export type AttachmentKind = "pre_invoice" | "post_invoice"

export interface DocumentAttachment {
  id: string
  organization_id: string
  document_type: DocumentType
  document_id: string
  kind: AttachmentKind
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

const BUCKET = "document-attachments"

export async function getDocumentAttachments(documentType: DocumentType, documentId: string): Promise<DocumentAttachment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("document_attachments")
    .select("*")
    .eq("document_type", documentType)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function uploadDocumentAttachment(
  file: File,
  organizationId: string,
  documentType: DocumentType,
  documentId: string,
  kind: AttachmentKind,
  userId: string
): Promise<DocumentAttachment> {
  const supabase = createClient()
  const fileExt = file.name.split(".").pop()
  const filePath = `${organizationId}/${documentType}/${documentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from("document_attachments")
    .insert({
      organization_id: organizationId,
      document_type: documentType,
      document_id: documentId,
      kind,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAttachmentSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteDocumentAttachment(attachment: DocumentAttachment): Promise<void> {
  const supabase = createClient()
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.file_path])
  if (storageError) throw storageError

  const { error } = await supabase.from("document_attachments").delete().eq("id", attachment.id)
  if (error) throw error
}
