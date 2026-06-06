import { useState, useEffect } from "react"
import {
  fetchAllFeedback,
  fetchAttachments,
  updateFeedbackStatus,
  type Feedback,
  type FeedbackAttachment,
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

export function App() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Record<string, FeedbackAttachment[]>>({})

  useEffect(() => {
    fetchAllFeedback()
      .then(setFeedbacks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function toggleExpand(fb: Feedback) {
    if (expandedId === fb.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(fb.id)
    if (!attachments[fb.id]) {
      try {
        const att = await fetchAttachments(fb.id)
        setAttachments((prev) => ({ ...prev, [fb.id]: att }))
      } catch {
        setAttachments((prev) => ({ ...prev, [fb.id]: [] }))
      }
    }
  }

  async function handleStatus(id: string, status: FeedbackStatus) {
    try {
      const updated = await updateFeedbackStatus(id, status)
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? updated : f)))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Feedback</h1>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!loading && feedbacks.length === 0 && (
        <p className="text-muted-foreground text-sm">No feedback yet.</p>
      )}

      {feedbacks.map((fb) => {
        const isExpanded = expandedId === fb.id
        const atts = attachments[fb.id] || []

        return (
          <div
            key={fb.id}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium border rounded-md px-2 py-0.5 ${TYPE_COLOR[fb.type]}`}>
                  {TYPE_LABEL[fb.type]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fb.user_name || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(fb.created_at).toLocaleDateString("fr-TN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <select
                value={fb.status}
                onChange={(e) => handleStatus(fb.id, e.target.value as FeedbackStatus)}
                className="text-xs border border-border rounded-md bg-card px-2 py-1 text-foreground shrink-0"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed">{fb.description}</p>

            {/* Attachments preview (collapsed) */}
            {!isExpanded && fb.id in attachments && atts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {atts.slice(0, 3).map((a) =>
                  isImage(a.file_type) ? (
                    <img
                      key={a.id}
                      src={a.file_url}
                      className="h-16 w-16 rounded-lg object-cover border border-border"
                    />
                  ) : isVideo(a.file_type) ? (
                    <video
                      key={a.id}
                      src={a.file_url}
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                  ) : null
                )}
                {atts.length > 3 && (
                  <span className="flex items-center text-xs text-muted-foreground px-2">
                    +{atts.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Toggle expand */}
            <button
              onClick={() => toggleExpand(fb)}
              className="text-xs text-primary hover:underline"
            >
              {isExpanded
                ? "Collapse"
                : `Show attachments (${fb.id in attachments ? atts.length : "..."})`}
            </button>

            {/* Expanded attachments */}
            {isExpanded && (
              <div className="space-y-3 border-t border-border pt-3">
                {atts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No attachments</p>
                ) : (
                  atts.map((a) => (
                    <div key={a.id} className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {a.file_name} {fmtBytes(a.file_size) && `· ${fmtBytes(a.file_size)}`}
                      </div>
                      {isImage(a.file_type) ? (
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={a.file_url}
                            alt={a.file_name}
                            className="rounded-lg border border-border max-h-64 object-contain"
                          />
                        </a>
                      ) : isVideo(a.file_type) ? (
                        <video
                          src={a.file_url}
                          controls
                          className="rounded-lg border border-border max-h-64"
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
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
