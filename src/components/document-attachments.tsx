"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Paperclip, X, Loader2, FileIcon } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import {
  getDocumentAttachments,
  uploadDocumentAttachment,
  getAttachmentSignedUrl,
  deleteDocumentAttachment,
  type DocumentAttachment,
  type DocumentType,
  type AttachmentKind,
} from "@/lib/supabase/attachments"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const KIND_LABELS: Record<AttachmentKind, string> = {
  pre_invoice: "Pre-invoice",
  post_invoice: "Post-invoice",
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentAttachmentsProps {
  documentType: DocumentType
  documentId: string
  organizationId: string
}

export function DocumentAttachments({ documentType, documentId, organizationId }: DocumentAttachmentsProps) {
  const { user } = useUser()
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<AttachmentKind>("pre_invoice")
  const [uploading, setUploading] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setAttachments(await getDocumentAttachments(documentType, documentId))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [documentType, documentId])

  useEffect(() => { load() }, [load])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (files.length === 0 || !user?.id) return

    const oversized = files.some((f) => f.size > MAX_FILE_SIZE)
    if (oversized) { alert("Files must be under 10MB."); return }

    setUploading(true)
    try {
      for (const file of files) {
        await uploadDocumentAttachment(file, organizationId, documentType, documentId, kind, user.id)
      }
      await load()
    } catch (err) {
      console.error(err)
      alert("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = async (attachment: DocumentAttachment) => {
    setOpeningId(attachment.id)
    try {
      const url = await getAttachmentSignedUrl(attachment.file_path)
      window.open(url, "_blank")
    } catch (err) {
      console.error(err)
      alert("Failed to open file")
    } finally {
      setOpeningId(null)
    }
  }

  const handleDelete = async (attachment: DocumentAttachment) => {
    try {
      await deleteDocumentAttachment(attachment)
      await load()
    } catch (err) {
      console.error(err)
      alert("Failed to delete file")
    }
  }

  const renderList = (items: DocumentAttachment[]) => (
    items.length === 0 ? (
      <div className="text-sm text-muted-foreground">None</div>
    ) : (
      <div className="space-y-1">
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-sm">
            <div className="flex items-center gap-2 truncate">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.file_name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.file_size)}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="sm" disabled={openingId === a.id} onClick={() => handleOpen(a)}>
                {openingId === a.id ? <Loader2 className="size-3 animate-spin" /> : "Open"}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => handleDelete(a)}>
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  )

  if (loading) return null

  const preInvoice = attachments.filter((a) => a.kind === "pre_invoice")
  const postInvoice = attachments.filter((a) => a.kind === "post_invoice")

  return (
    <Card>
      <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="grid gap-2">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as AttachmentKind)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_invoice">Pre-invoice</SelectItem>
                <SelectItem value="post_invoice">Post-invoice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" disabled={uploading || !user?.id} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            Add files
          </Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        </div>
        {!user?.id && <div className="text-sm text-muted-foreground">Log in to upload files.</div>}

        <div className="space-y-2">
          <Label className="text-muted-foreground">Pre-invoice</Label>
          {renderList(preInvoice)}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Post-invoice</Label>
          {renderList(postInvoice)}
        </div>
      </CardContent>
    </Card>
  )
}
