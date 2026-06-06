"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  MessageSquarePlus,
  X,
  Paperclip,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createFeedback,
  uploadFeedbackAttachment,
  type FeedbackType,
} from "@/lib/supabase/feedback"
import { useUser } from "@/contexts/user-context"

const ACCEPTED_TYPES = "image/*,video/*"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const FEEDBACK_LABELS: Record<FeedbackType, string> = {
  bug: "Report a Bug",
  feature: "Adding a Feature",
  improvement: "Feature Improvement",
}

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("bug")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useUser()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    const valid = selected.filter((f) => f.size <= MAX_FILE_SIZE)
    if (valid.length < selected.length) {
      alert("Some files exceeded the 10MB limit and were removed.")
    }
    setFiles((prev) => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      alert("Please describe your feedback.")
      return
    }

    setLoading(true)
    try {
      const uploaded: { file_name: string; file_url: string; file_type: string; file_size: number }[] = []

      if (user?.id) {
        for (const file of files) {
          const result = await uploadFeedbackAttachment(file, user.id)
          uploaded.push(result)
        }
      }

      await createFeedback(
        {
          user_id: user?.id || null,
          user_name: user?.name || null,
          user_email: user?.email || null,
          type,
          description: description.trim(),
        },
        uploaded.length > 0 ? uploaded : undefined
      )

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setType("bug")
        setDescription("")
        setFiles([])
      }, 1500)
    } catch (err) {
      alert("Failed to submit feedback. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setSubmitted(false)
    setType("bug")
    setDescription("")
    setFiles([])
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div
          className={cn(
            "mb-3 w-[380px] rounded-xl border bg-background shadow-2xl transition-all",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Send Feedback</h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleClose}
            >
              <X className="size-4" />
            </Button>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm font-medium">Thank you for your feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as FeedbackType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">{FEEDBACK_LABELS.bug}</SelectItem>
                    <SelectItem value="feature">
                      {FEEDBACK_LABELS.feature}
                    </SelectItem>
                    <SelectItem value="improvement">
                      {FEEDBACK_LABELS.improvement}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className={cn(
                    "flex min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  placeholder="Describe the issue, feature, or improvement..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* File attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attachments</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="size-3" />
                    Add files
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs"
                      >
                        <span className="truncate pr-2">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-5 shrink-0"
                          onClick={() => removeFile(i)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              {!user?.id && (
                <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  You are not logged in. Your feedback will be submitted anonymously.
                  {files.length > 0 && " File attachments require login."}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !description.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <Button
        size="icon"
        className={cn(
          "size-12 rounded-full shadow-lg transition-all",
          isOpen
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
      >
        {isOpen ? <X className="size-5" /> : <MessageSquarePlus className="size-5" />}
      </Button>
    </div>
  )
}
