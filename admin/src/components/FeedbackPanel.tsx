import { useEffect, useRef, useState } from "react"
import {
  addNote,
  deleteNote,
  fetchAttachments,
  fetchNotes,
  type Feedback,
  type FeedbackAttachment,
  type FeedbackNote,
  type FeedbackStatus,
} from "@/lib/supabase"

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
}

const TYPE_COLOR: Record<string, string> = {
  bug: "bg-red-500/15 text-red-400 border-red-500/20",
  feature: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  improvement: "bg-amber-500/15 text-amber-400 border-amber-500/20",
}

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
}

const STATUS_LIST: FeedbackStatus[] = ["open", "in_progress", "resolved", "closed"]

function isImage(t: string) {
  return t.startsWith("image/")
}
function isVideo(t: string) {
  return t.startsWith("video/")
}
function fmtBytes(b: number | null) {
  if (!b) return ""
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function FeedbackPanel({
  feedback,
  onClose,
  onStatusChange,
  onNotesCountChange,
}: {
  feedback: Feedback
  onClose: () => void
  onStatusChange: (id: string, status: FeedbackStatus) => void
  onNotesCountChange: (id: string, count: number) => void
}) {
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([])
  const [notes, setNotes] = useState<FeedbackNote[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([fetchAttachments(feedback.id), fetchNotes(feedback.id)])
      .then(([att, n]) => {
        if (!active) return
        setAttachments(att)
        setNotes(n)
      })
      .catch(() => {
        if (!active) return
        setAttachments([])
        setNotes([])
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [feedback.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleAddNote() {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    try {
      const note = await addNote(feedback.id, body)
      const next = [...notes, note]
      setNotes(next)
      onNotesCountChange(feedback.id, next.length)
      setDraft("")
      textareaRef.current?.focus()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteNote(id: string) {
    const prev = notes
    const next = notes.filter((n) => n.id !== id)
    setNotes(next)
    onNotesCountChange(feedback.id, next.length)
    try {
      await deleteNote(id)
    } catch (e) {
      console.error(e)
      setNotes(prev)
      onNotesCountChange(feedback.id, prev.length)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium border rounded-md px-2 py-0.5 ${TYPE_COLOR[feedback.type]}`}
            >
              {TYPE_LABEL[feedback.type]}
            </span>
            <select
              value={feedback.status}
              onChange={(e) =>
                onStatusChange(feedback.id, e.target.value as FeedbackStatus)
              }
              className="text-xs border border-border rounded-md bg-card px-2 py-1 text-foreground"
            >
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 text-lg leading-none shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Reporter */}
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {feedback.user_name || "Anonymous"}
            </div>
            {feedback.user_email && (
              <div className="text-xs text-muted-foreground">
                {feedback.user_email}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {fmtDate(feedback.created_at)}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {feedback.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attachments {!loading && `(${attachments.length})`}
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attachments</p>
            ) : (
              <div className="space-y-3">
                {attachments.map((a) => (
                  <div key={a.id} className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {a.file_name}
                      {fmtBytes(a.file_size) && ` · ${fmtBytes(a.file_size)}`}
                    </div>
                    {isImage(a.file_type) ? (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={a.file_url}
                          alt={a.file_name}
                          className="rounded-lg border border-border max-h-64 object-contain w-full"
                        />
                      </a>
                    ) : isVideo(a.file_type) ? (
                      <video
                        src={a.file_url}
                        controls
                        className="rounded-lg border border-border max-h-64 w-full"
                      />
                    ) : (
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-primary hover:underline"
                      >
                        Open file
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes {!loading && `(${notes.length})`}
            </div>

            {!loading && notes.length === 0 && (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            )}

            <div className="space-y-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="group rounded-lg border border-border bg-muted/40 p-3 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">
                      {n.body}
                    </p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      aria-label="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtDate(n.created_at)}
                  </div>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
                placeholder="Add a note…"
                rows={3}
                className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  ⌘/Ctrl + Enter to save
                </span>
                <button
                  onClick={handleAddNote}
                  disabled={!draft.trim() || saving}
                  className="text-xs font-medium rounded-md bg-primary text-primary-foreground px-3 py-1.5 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
