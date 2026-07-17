export const SIDEBAR_PREFS_STORAGE_KEY = "efficiency:sidebar-prefs"

export type SidebarPrefs = {
  order: string[]
  hidden: string[]
}

export const DEFAULT_SIDEBAR_PREFS: SidebarPrefs = { order: [], hidden: [] }

export function readSidebarPrefs(): SidebarPrefs {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_PREFS
  try {
    const raw = window.localStorage.getItem(SIDEBAR_PREFS_STORAGE_KEY)
    if (!raw) return DEFAULT_SIDEBAR_PREFS
    const parsed = JSON.parse(raw)
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    }
  } catch {
    return DEFAULT_SIDEBAR_PREFS
  }
}

// Applies stored order/hidden prefs to a list of nav-like items keyed by `url`.
// Items not yet present in the stored order (e.g. newly added pages) are
// appended in their natural order so they still show up after an upgrade.
export function applySidebarOrder<T extends { url: string }>(items: T[], order: string[]): T[] {
  const byUrl = new Map(items.map((i) => [i.url, i]))
  const ordered = order.filter((url) => byUrl.has(url)).map((url) => byUrl.get(url)!)
  const remaining = items.filter((i) => !order.includes(i.url))
  return [...ordered, ...remaining]
}
