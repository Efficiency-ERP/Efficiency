import { createClient } from "@/lib/supabase/client"
import type { Article, DocumentFlow, InvoiceType, IssueDirection, StockMovement } from "@/types/database"

export async function getStockMovements(organizationId?: string): Promise<StockMovement[]> {
  const supabase = createClient()
  let query = supabase
    .from("stock_movements")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Which way an invoice moves stock, as a multiplier on each line's quantity.
// A sale ships goods out and a purchase brings them in; an avoir undoes its
// own side (a customer returning goods, or us returning them to a supplier);
// a debit note corrects a price and moves no goods at all.
export function invoiceStockSign(flow: DocumentFlow, subtype: InvoiceType): -1 | 0 | 1 {
  if (subtype === "debit") return 0
  const outward = flow === "sale"
  const reversed = subtype === "credit"
  return outward !== reversed ? -1 : 1
}

// A bon de sortie takes goods out; a bon d'entrée is a correction that adds.
export function issueStockSign(direction: IssueDirection): -1 | 1 {
  return direction === "in" ? 1 : -1
}

export type StockSource =
  | { type: "invoice"; documentId: string }
  | { type: "issue"; issueId: string }

type StockLine = { article_id?: string | null; quantity: number }

// Applies one document's movements atomically through apply_stock_movements
// (supabase/19-stock-ledger.sql): every line or none, with the balance changed
// in a single UPDATE so concurrent documents cannot lose each other's update.
// Only lines on a product article move stock; the function skips services
// and freeform lines itself, so callers pass every line and need not filter.
// Returns the articles whose balance changed, for the client store.
export async function applyStockMovements(
  source: StockSource,
  date: string | undefined,
  lines: StockLine[],
  sign: -1 | 1
): Promise<Article[]> {
  const movements = lines
    .filter((l) => l.article_id && l.quantity)
    .map((l) => ({ article_id: l.article_id, quantity_delta: sign * l.quantity }))
  if (movements.length === 0) return []

  const supabase = createClient()
  const { data, error } = await supabase.rpc("apply_stock_movements", {
    p_source_type: source.type,
    p_source_document_id: source.type === "invoice" ? source.documentId : null,
    p_source_issue_id: source.type === "issue" ? source.issueId : null,
    p_date: date ?? null,
    p_lines: movements,
  })
  if (error) throw error
  return (data as Article[] | null) || []
}

// The article form's stock section. Sends the change the user made rather
// than the value they ended on, so a document that moved stock while the form
// was open is kept instead of silently overwritten. A non-zero change is
// logged as an adjustment; minStock is set in the same statement.
export async function adjustArticleStock(
  articleId: string,
  onHandDelta: number,
  minStock: number
): Promise<Article> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("adjust_article_stock", {
    p_article_id: articleId,
    p_on_hand_delta: onHandDelta,
    p_min_stock: minStock,
  })
  if (error) throw error
  return data as Article
}
