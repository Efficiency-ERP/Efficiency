import { createClient } from "@/lib/supabase/client"
import { recordDeliveryStockMovements } from "@/lib/supabase/stock"
import type { Article, Invoice, InvoiceType, InvoiceDirection, InvoiceLine, ConsignmentLine, Delivery, DeliveryLine, Order, OrderLine, Issue, IssueLine, Quote, QuoteLine, TaxCharge } from "@/types/database"

// ============================================
// DOCUMENT NUMBERING
// ============================================

// Atomically issues the next sequential number for a document type (e.g.
// getNextDocumentNumber(orgId, "I") -> "I-2608-00001"), per organization
// per month. Backed by the next_document_number() Postgres function.
export async function getNextDocumentNumber(organizationId: string, prefix: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("next_document_number", { p_org_id: organizationId, p_prefix: prefix })
  if (error) throw error
  return data as string
}

// Invoices default to money-in for a sale, money-out for a purchase. A
// credit or debit note always inherits the flow of the invoice it corrects —
// whether the correction adds or subtracts is a separate question, decided
// by type alone (see correctionSign below), never by flipping direction.
// Still just a default — callers can override per-invoice.
export function defaultDirectionFor(flow: "sale" | "purchase"): InvoiceDirection {
  return flow === "sale" ? "in" : "out"
}

// Credit/debit note lines and totals always hold real, positive
// quantities/amounts (never a negative stored to mean "this reduces").
// Whether a correction's magnitude should add to or subtract from an
// aggregate (Money In/Out, a running balance) is decided here, from type
// alone — the one place that sign lives.
export function correctionSign(type: InvoiceType): 1 | -1 {
  return type === "credit" ? -1 : 1
}

// ============================================
// QUOTES
// ============================================

export async function getQuotes(organizationId?: string): Promise<Quote[]> {
  const supabase = createClient()
  let query = supabase.from("quotes").select("*").order("date", { ascending: false })
  if (organizationId) query = query.eq("organization_id", organizationId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getQuote(id: string): Promise<Quote | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("quotes").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export async function getQuoteLines(quoteId: string): Promise<QuoteLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("quote_lines").select("*").eq("quote_id", quoteId)
  if (error) throw error
  return data || []
}

export async function createQuote(
  quote: Omit<Quote, "id" | "created_at" | "totals">,
  lines: Omit<QuoteLine, "id" | "quote_id">[]
): Promise<Quote> {
  const supabase = createClient()

  const totals = computeInvoiceTotals(lines.map((l) => ({ ...l, tax_charges: l.tax_charges as unknown as TaxCharge[] })))

  const { data: q, error: qError } = await supabase.from("quotes").insert({ ...quote, totals }).select().single()
  if (qError) throw qError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("quote_lines")
      .insert(lines.map((l) => ({ ...l, quote_id: q.id })))
    if (linesError) throw linesError
  }

  return q
}

// Whether a quote has been invoiced is always a derived lookup (does any
// invoice reference it via source_quote_id) — never gated on quotes.status,
// which is reserved for genuine human-decision states (draft/sent/rejected)
// and is not itself the link.
export async function getInvoiceBySourceQuote(quoteId: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("invoices").select("*").eq("source_quote_id", quoteId).maybeSingle()
  if (error) throw error
  return data
}

// Marks a quote accepted once its resulting invoice has actually been saved
// (see the invoice create form's sourceQuoteId prefill flow) — quotes stay
// mutable, so this is the only place a quote's status changes.
export async function markQuoteAccepted(quoteId: string): Promise<Quote> {
  const supabase = createClient()
  const { data, error } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", quoteId).select().single()
  if (error) throw error
  return data
}

// ============================================
// INVOICES
// ============================================

export async function getInvoices(organizationId?: string): Promise<Invoice[]> {
  const supabase = createClient()
  let query = supabase
    .from("invoices")
    .select("*")
    .order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

// Credit/debit notes reference the invoice they correct via
// original_invoice_id — never the reverse — so an invoice can have more
// than one correction over time (e.g. partial credits on different lines).
export async function getCorrectionsForInvoice(invoiceId: string): Promise<Invoice[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("original_invoice_id", invoiceId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", invoiceId)

  if (error) throw error
  return data || []
}

export async function getConsignments(invoiceId: string): Promise<ConsignmentLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("consignment_lines")
    .select("*")
    .eq("invoice_id", invoiceId)

  if (error) throw error
  return data || []
}

// Invoices are immutable (DB trigger blocks UPDATE/DELETE), so totals are
// computed up front and the row is written once — no insert-then-update.
export async function createInvoice(
  invoice: Omit<Invoice, "id" | "created_at" | "totals">,
  lines: (Omit<InvoiceLine, "id" | "invoice_id"> & { transfer_price?: number })[],
  consignments: Omit<ConsignmentLine, "id" | "invoice_id">[]
): Promise<Invoice> {
  const supabase = createClient()

  const totals = computeInvoiceTotals(lines.map((l) => ({ ...l, tax_charges: l.tax_charges as unknown as TaxCharge[] })))

  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .insert({ ...invoice, totals })
    .select()
    .single()

  if (invError) throw invError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lines.map(({ transfer_price: _transferPrice, ...l }) => ({ ...l, invoice_id: inv.id })))

    if (linesError) throw linesError
  }

  if (consignments.length > 0) {
    const { error: consError } = await supabase
      .from("consignment_lines")
      .insert(consignments.map((c) => ({ ...c, invoice_id: inv.id })))

    if (consError) throw consError
  }

  return inv
}

// ============================================
// DELIVERIES
// ============================================

export async function getDeliveries(organizationId?: string): Promise<Delivery[]> {
  const supabase = createClient()
  let query = supabase
    .from("deliveries")
    .select("*")
    .order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// A quote can reasonably produce more than one delivery over time (partial
// shipments), so this returns all of them via the derived link
// (deliveries.source_quote_id) rather than a single stored pointer.
export async function getDeliveriesBySourceQuote(quoteId: string): Promise<Delivery[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("source_quote_id", quoteId)
    .order("date", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getDelivery(id: string): Promise<Delivery | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function getDeliveryLines(deliveryId: string): Promise<DeliveryLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("delivery_lines")
    .select("*")
    .eq("delivery_id", deliveryId)

  if (error) throw error
  return data || []
}

export async function createDelivery(
  delivery: Omit<Delivery, "id" | "created_at">,
  lines: Omit<DeliveryLine, "id" | "delivery_id">[]
): Promise<{ delivery: Delivery; updatedArticles: Article[] }> {
  const supabase = createClient()

  const { data: del, error: delError } = await supabase
    .from("deliveries")
    .insert(delivery)
    .select()
    .single()

  if (delError) throw delError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("delivery_lines")
      .insert(lines.map((l) => ({ ...l, delivery_id: del.id })))

    if (linesError) throw linesError
  }

  const updatedArticles = await recordDeliveryStockMovements(del.organization_id, del.id, del.date, lines)

  return { delivery: del, updatedArticles }
}

// ============================================
// ORDERS
// ============================================

export async function getOrders(organizationId?: string): Promise<Order[]> {
  const supabase = createClient()
  let query = supabase
    .from("orders")
    .select("*")
    .order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function getOrderLines(orderId: string): Promise<OrderLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("order_lines")
    .select("*")
    .eq("order_id", orderId)

  if (error) throw error
  return data || []
}

export async function createOrder(
  order: Omit<Order, "id" | "created_at">,
  lines: Omit<OrderLine, "id" | "order_id">[]
): Promise<Order> {
  const supabase = createClient()

  const { data: ord, error: ordError } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single()

  if (ordError) throw ordError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("order_lines")
      .insert(lines.map((l) => ({ ...l, order_id: ord.id })))

    if (linesError) throw linesError
  }

  return ord
}

// Whether an order has been invoiced is always a derived lookup (does any
// invoice reference it via source_order_id), never a stored pointer on the
// order — same rule as Quote→Invoice/Quote→Delivery, and correctly allows
// more than one invoice per order later (partial invoicing, corrections).
export async function getInvoiceBySourceOrder(orderId: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("invoices").select("*").eq("source_order_id", orderId).maybeSingle()
  if (error) throw error
  return data
}

// Marks an order final once its resulting invoice has actually been saved
// (see the invoice create form's sourceOrderId prefill flow) — a plain
// status flip, not the link itself (that's invoices.source_order_id).
export async function markOrderFinal(orderId: string): Promise<Order> {
  const supabase = createClient()
  const { data, error } = await supabase.from("orders").update({ status: "final" }).eq("id", orderId).select().single()
  if (error) throw error
  return data
}

// ============================================
// ISSUES
// ============================================

export async function getIssues(organizationId?: string): Promise<Issue[]> {
  const supabase = createClient()
  let query = supabase
    .from("issues")
    .select("*")
    .order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getIssue(id: string): Promise<Issue | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function getIssueLines(issueId: string): Promise<IssueLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("issue_lines")
    .select("*")
    .eq("issue_id", issueId)

  if (error) throw error
  return data || []
}

export async function createIssue(
  issue: Omit<Issue, "id" | "created_at">,
  lines: Omit<IssueLine, "id" | "issue_id">[]
): Promise<Issue> {
  const supabase = createClient()

  const { data: iss, error: issError } = await supabase
    .from("issues")
    .insert(issue)
    .select()
    .single()

  if (issError) throw issError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("issue_lines")
      .insert(lines.map((l) => ({ ...l, issue_id: iss.id })))

    if (linesError) throw linesError
  }

  return iss
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function computeInvoiceTotals(lines: {
  unit_price_puht: number
  remise_percent?: number | null
  quantity: number
  transfer_price?: number | null
  tax_charges: TaxCharge[]
}[]) {
  let htSubtotal = 0
  const chargesByKey: Record<string, number> = {}
  let ttc = 0

  for (const line of lines) {
    const remise = line.remise_percent ? (line.unit_price_puht * line.remise_percent) / 100 : 0
    const ht = (line.unit_price_puht - remise) * line.quantity
    const transferAmount = (line.transfer_price || 0) * line.quantity

    htSubtotal += ht

    let cumulative = ht
    let lineTotal = ht
    for (const charge of line.tax_charges) {
      const base = charge.base === "transfer" ? transferAmount : charge.base === "cumulative" ? cumulative : ht
      const amount = (base * charge.rate) / 100
      const key = `${charge.label} ${charge.rate}%`
      chargesByKey[key] = (chargesByKey[key] || 0) + amount
      cumulative += amount
      lineTotal += amount
    }
    ttc += lineTotal
  }

  return { htSubtotal, chargesByKey, ttc }
}
