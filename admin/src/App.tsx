import { useEffect, useMemo, useState } from "react"
import {
  fetchAllFeedback,
  fetchNoteCounts,
  updateFeedbackStatus,
  type Feedback,
  type FeedbackStatus,
} from "@/lib/supabase"
import { FeedbackPanel } from "@/components/FeedbackPanel"

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

const COLUMNS: { status: FeedbackStatus; label: string; accent: string }[] = [
  { status: "open", label: "Open", accent: "bg-slate-400" },
  { status: "in_progress", label: "In progress", accent: "bg-blue-500" },
  { status: "resolved", label: "Resolved", accent: "bg-emerald-500" },
  { status: "closed", label: "Closed", accent: "bg-zinc-500" },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function FeedbackCard({
  fb,
  noteCount,
  onClick,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  fb: Feedback
  noteCount: number
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  dragging: boolean
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm transition hover:border-ring/50 hover:shadow ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-medium border rounded-md px-1.5 py-0.5 ${TYPE_COLOR[fb.type]}`}
        >
          {TYPE_LABEL[fb.type]}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {fmtDate(fb.created_at)}
        </span>
      </div>

      <p className="text-sm leading-snug line-clamp-3">{fb.description}</p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-muted-foreground truncate">
          {fb.user_name || "Anonymous"}
        </span>
        {noteCount > 0 && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            🗒 {noteCount}
          </span>
        )}
      </div>
    </div>
  )
}

export function App() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<FeedbackStatus | null>(null)

  useEffect(() => {
    Promise.all([fetchAllFeedback(), fetchNoteCounts()])
      .then(([fbs, counts]) => {
        setFeedbacks(fbs)
        setNoteCounts(counts)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const byStatus = useMemo(() => {
    const map: Record<FeedbackStatus, Feedback[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    }
    for (const fb of feedbacks) map[fb.status]?.push(fb)
    return map
  }, [feedbacks])

  const selected = feedbacks.find((f) => f.id === selectedId) || null

  async function moveTo(id: string, status: FeedbackStatus) {
    const current = feedbacks.find((f) => f.id === id)
    if (!current || current.status === status) return

    // Optimistic update
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    )
    try {
      await updateFeedbackStatus(id, status)
    } catch (e) {
      console.error(e)
      // Revert
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: current.status } : f))
      )
    }
  }

  function handleDrop(status: FeedbackStatus) {
    if (draggingId) moveTo(draggingId, status)
    setDraggingId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Drag cards between columns. Click a card for details and notes.
        </p>
      </header>

      {loading && (
        <p className="text-muted-foreground text-sm p-6">Loading…</p>
      )}
      {error && <p className="text-destructive text-sm p-6">{error}</p>}

      {!loading && !error && (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-w-fit">
            {COLUMNS.map((col) => {
              const items = byStatus[col.status]
              const isOver = dragOverStatus === col.status
              return (
                <div
                  key={col.status}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverStatus !== col.status) setDragOverStatus(col.status)
                  }}
                  onDragLeave={(e) => {
                    // Only clear if leaving the column entirely
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStatus((s) => (s === col.status ? null : s))
                    }
                  }}
                  onDrop={() => handleDrop(col.status)}
                  className={`flex flex-col rounded-xl border bg-muted/30 transition ${
                    isOver ? "border-ring ring-2 ring-ring/30" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                    <span className={`h-2 w-2 rounded-full ${col.accent}`} />
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 p-2 space-y-2 min-h-24">
                    {items.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        {isOver ? "Drop here" : "Empty"}
                      </div>
                    )}
                    {items.map((fb) => (
                      <FeedbackCard
                        key={fb.id}
                        fb={fb}
                        noteCount={noteCounts[fb.id] || 0}
                        onClick={() => setSelectedId(fb.id)}
                        onDragStart={() => setDraggingId(fb.id)}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDragOverStatus(null)
                        }}
                        dragging={draggingId === fb.id}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected && (
        <FeedbackPanel
          feedback={selected}
          onClose={() => setSelectedId(null)}
          onStatusChange={(id, status) => moveTo(id, status)}
          onNotesCountChange={(id, count) =>
            setNoteCounts((prev) => ({ ...prev, [id]: count }))
          }
        />
      )}
    </div>
  )
}
