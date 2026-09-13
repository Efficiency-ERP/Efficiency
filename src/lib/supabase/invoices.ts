import { createClient } from "@/lib/supabase/client"
import { recordDeliveryStockMovements } from "@/lib/supabase/stock"
import { castJson } from "@/lib/utils"
import type {
  Article, Invoice, InvoiceType, InvoiceDirection, InvoiceLine, ConsignmentLine, ConsignmentBalance,
  ConsignmentPackaging, Consignment, Delivery, DeliveryLine, Order, OrderLine, OrderType, Issue, IssueLine,
  Quote, QuoteLine, QuoteStatus, DocumentStatus, TaxCharge, InvoiceTotals, DocumentAttributes, CounterpartyKind, PaymentMethod,
} from "@/types/database"

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

// Net effect of one invoice on cash position: positive means it moves
// money toward you, negative means away — sale documents start positive,
// purchase documents start negative, and correctionSign flips that
// further for a credit note. Used for the per-row +/- shown in an
// invoice list, not for the Money In/Money Out totals (those stay
// separate per-direction sums of magnitude, filtered by direction first).
export function netCashFlow(invoice: Invoice): number {
  const type = (invoice.subtype as InvoiceType) || "standard"
  const magnitude = correctionSign(type) * (castJson<InvoiceTotals>(invoice.totals).total_incl_tax || 0)
  return invoice.direction === "out" ? -magnitude : magnitude
}

// ============================================
// QUOTES
// ============================================

type QuoteInput = {
  number: string
  date?: string
  organization_id: string
  counterparty_id: string
  status?: QuoteStatus
  notes?: string | null
}

export async function getQuotes(organizationId?: string): Promise<Quote[]> {
  const supabase = createClient()
  let query = supabase.from("documents").select("*").eq("kind", "quote").order("date", { ascending: false })
  if (organizationId) query = query.eq("organization_id", organizationId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getQuote(id: string): Promise<Quote | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).eq("kind", "quote").single()
  if (error) throw error
  return data
}

export async function getQuoteLines(quoteId: string): Promise<QuoteLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("document_lines").select("*").eq("document_id", quoteId)
  if (error) throw error
  return data || []
}

export async function createQuote(
  quote: QuoteInput,
  lines: Omit<QuoteLine, "id" | "document_id">[]
): Promise<Quote> {
  const supabase = createClient()

  const totals = computeInvoiceTotals(lines.map((l) => ({ ...l, tax_charges: l.tax_charges as unknown as TaxCharge[] })))

  const { data: q, error: qError } = await supabase
    .from("documents")
    .insert({
      kind: "quote",
      flow: "sale",
      number: quote.number,
      date: quote.date,
      organization_id: quote.organization_id,
      counterparty_id: quote.counterparty_id,
      status: quote.status || "draft",
      notes: quote.notes,
      totals,
    })
    .select()
    .single()
  if (qError) throw qError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("document_lines")
      .insert(lines.map((l) => ({ ...l, document_id: q.id })))
    if (linesError) throw linesError
  }

  return q
}

// Whether a quote has been invoiced is always a derived lookup (does any
// invoice reference it via source_document_id) — never gated on quotes.status,
// which is reserved for genuine human-decision states (draft/sent/rejected)
// and is not itself the link.
export async function getInvoiceBySourceQuote(quoteId: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("kind", "invoice")
    .eq("source_document_id", quoteId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Marks a quote accepted once its resulting invoice has actually been saved
// (see the invoice create form's sourceQuoteId prefill flow) — quotes stay
// mutable, so this is the only place a quote's status changes.
export async function markQuoteAccepted(quoteId: string): Promise<Quote> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").update({ status: "accepted" }).eq("id", quoteId).select().single()
  if (error) throw error
  return data
}

// ============================================
// INVOICES
// ============================================

type InvoiceInput = {
  number: string
  date?: string
  due_date?: string | null
  organization_id: string
  counterparty_id: string
  type: InvoiceType
  direction: InvoiceDirection
  payment_method?: PaymentMethod | null
  counterparty_kind?: CounterpartyKind
  source_quote_id?: string | null
  source_order_id?: string | null
  source_delivery_id?: string | null
  original_invoice_id?: string | null
  notes?: string | null
}

export async function getInvoices(organizationId?: string): Promise<Invoice[]> {
  const supabase = createClient()
  let query = supabase.from("documents").select("*").eq("kind", "invoice").order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).eq("kind", "invoice").single()
  if (error) throw error
  return data
}

// Credit/debit notes reference the invoice they correct via
// source_document_id — never the reverse — so an invoice can have more
// than one correction over time (e.g. partial credits on different lines).
export async function getCorrectionsForInvoice(invoiceId: string): Promise<Invoice[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("kind", "invoice")
    .eq("source_document_id", invoiceId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("document_lines")
    .select("*")
    .eq("document_id", invoiceId)

  if (error) throw error
  return data || []
}

export async function getConsignments(invoiceId: string): Promise<ConsignmentLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("consignment_lines")
    .select("*")
    .eq("document_id", invoiceId)

  if (error) throw error
  return data || []
}

// Outstanding deposit liability per packaging type for one counterparty,
// backed by the consignment_balances view (charges via invoices, returns
// direct). Zeroed-out rows are dropped so a return form only ever offers
// packaging types actually still outstanding.
export async function getConsignmentBalances(counterpartyId: string): Promise<ConsignmentBalance[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("consignment_balances")
    .select("*")
    .eq("counterparty_id", counterpartyId)
    .neq("quantity_outstanding", 0)

  if (error) throw error
  return data || []
}

// Every counterparty's outstanding balance, for the Consignments overview.
export async function getAllConsignmentBalances(organizationId?: string): Promise<ConsignmentBalance[]> {
  const supabase = createClient()
  let query = supabase.from("consignment_balances").select("*").neq("quantity_outstanding", 0)
  if (organizationId) query = query.eq("organization_id", organizationId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// A standalone deposit refund — packaging physically returned, no invoice
// involved. Quantity/total are stored negative (the same signed-delta
// convention stock_movements already uses) so they net directly against
// the positive charge rows an invoice created for the same counterparty +
// packaging_type. Callers always pass the physical quantity returned as a
// positive number; the sign is applied here, not left to the caller.
export async function createConsignmentReturn(
  entry: { organization_id: string; counterparty_id: string; date: string; direction: "in" | "out"; notes: string | null },
  lines: { packaging_type: string; units_per_article: number; quantity: number; deposit_value: number }[]
): Promise<ConsignmentLine[]> {
  const supabase = createClient()
  const rows = lines.map((l) => {
    const quantity = -Math.abs(l.quantity)
    return {
      ...entry,
      document_id: null,
      source_line_id: null,
      packaging_type: l.packaging_type,
      units_per_article: l.units_per_article,
      quantity,
      deposit_value: l.deposit_value,
      total: quantity * l.deposit_value,
    }
  })

  const { data, error } = await supabase.from("consignment_lines").insert(rows).select()
  if (error) throw error
  return data || []
}

// The subset of consignment_lines columns a per-invoice-line deposit charge
// fills in — everything a standalone return needs (organization_id,
// counterparty_id, date, direction, notes) stays null on a charge row,
// derivable instead via its invoice.
export type ConsignmentCharge = Pick<ConsignmentLine, "packaging_type" | "units_per_article" | "quantity" | "deposit_value" | "total">

// Invoices are immutable (DB trigger blocks UPDATE/DELETE), so totals are
// computed up front and the row is written once — no insert-then-update.
// Each line carries its own consignments (deposits for the packaging that
// line's article ships in) — consignment_lines.source_line_id is required,
// so line ids are generated client-side up front rather than insert-then-
// -relink, letting both tables be inserted from data we already have.
export async function createInvoice(
  invoice: InvoiceInput,
  lines: (Omit<InvoiceLine, "id" | "document_id"> & {
    transfer_price?: number
    consignments?: ConsignmentCharge[]
  })[]
): Promise<Invoice> {
  const supabase = createClient()

  const totals = computeInvoiceTotals(lines.map((l) => ({ ...l, tax_charges: l.tax_charges as unknown as TaxCharge[] })))

  const flow: "sale" | "purchase" =
    invoice.source_quote_id ? "sale" : invoice.source_order_id ? "purchase" : invoice.direction === "in" ? "sale" : "purchase"

  const attributes: DocumentAttributes = {
    payment_method: invoice.payment_method ?? null,
    counterparty_kind: invoice.counterparty_kind || "contact",
  }

  const { data: inv, error: invError } = await supabase
    .from("documents")
    .insert({
      kind: "invoice",
      subtype: invoice.type,
      flow,
      direction: invoice.direction,
      number: invoice.number,
      date: invoice.date,
      due_date: invoice.due_date,
      organization_id: invoice.organization_id,
      counterparty_id: invoice.counterparty_id,
      source_document_id: invoice.source_quote_id || invoice.source_order_id || invoice.source_delivery_id || invoice.original_invoice_id || null,
      attributes,
      notes: invoice.notes,
      totals,
    })
    .select()
    .single()

  if (invError) throw invError

  if (lines.length > 0) {
    const linesWithIds = lines.map((l) => ({ ...l, id: crypto.randomUUID() }))

    const { error: linesError } = await supabase
      .from("document_lines")
      .insert(linesWithIds.map(({ transfer_price: _transferPrice, consignments: _consignments, ...l }) => ({ ...l, document_id: inv.id })))

    if (linesError) throw linesError

    const consignmentRows = linesWithIds.flatMap((l) =>
      (l.consignments || []).map((c) => ({
        ...c,
        document_id: inv.id,
        source_line_id: l.id,
        organization_id: null,
        counterparty_id: null,
        date: null,
        direction: null,
        notes: null,
      }))
    )

    if (consignmentRows.length > 0) {
      const { error: consError } = await supabase.from("consignment_lines").insert(consignmentRows)
      if (consError) throw consError
    }
  }

  return inv
}

// Picks which packaging container(s) to charge a deposit for, given a
// quantity of units sold and the article's configured options. Options
// that share a `type` (e.g. two different crate sizes both filed under
// "CASIER") are alternatives, not simultaneous charges — unitsPerArticle
// is a container's capacity, not a per-unit multiplier. Tries an exact
// combination largest-size-first (e.g. 18 with a 12-fit and a 6-fit ->
// one of each); if the quantity doesn't divide evenly across the
// available sizes (e.g. 7 with only 6-fit/12-fit), that partial
// combination is discarded in favor of a single container of the
// smallest size that covers the whole quantity, rather than leaving a
// partial container.
export function pickPackagingContainers(packaging: ConsignmentPackaging[], quantity: number): ConsignmentCharge[] {
  if (quantity <= 0) return []

  const byType = new Map<string, ConsignmentPackaging[]>()
  for (const pkg of packaging) {
    const list = byType.get(pkg.type) || []
    list.push(pkg)
    byType.set(pkg.type, list)
  }

  const result: ConsignmentCharge[] = []

  for (const [type, options] of byType) {
    const sizesDesc = [...options].sort((a, b) => b.unitsPerArticle - a.unitsPerArticle)
    const counts = new Map<number, number>()
    let remaining = quantity

    for (const size of sizesDesc) {
      const count = Math.floor(remaining / size.unitsPerArticle)
      if (count > 0) {
        counts.set(size.unitsPerArticle, count)
        remaining -= count * size.unitsPerArticle
      }
    }

    if (remaining > 0) {
      const covering = sizesDesc.filter((s) => s.unitsPerArticle >= quantity).sort((a, b) => a.unitsPerArticle - b.unitsPerArticle)[0]
      if (covering) {
        result.push({ packaging_type: type, units_per_article: covering.unitsPerArticle, quantity: 1, deposit_value: covering.depositValue, total: covering.depositValue })
      } else {
        // Quantity exceeds even the largest configured size — use as many
        // of the largest as needed to cover it.
        const largest = sizesDesc[0]
        const count = Math.ceil(quantity / largest.unitsPerArticle)
        result.push({ packaging_type: type, units_per_article: largest.unitsPerArticle, quantity: count, deposit_value: largest.depositValue, total: count * largest.depositValue })
      }
      continue
    }

    for (const [unitsPerArticle, count] of counts) {
      const size = options.find((o) => o.unitsPerArticle === unitsPerArticle)!
      result.push({ packaging_type: type, units_per_article: unitsPerArticle, quantity: count, deposit_value: size.depositValue, total: count * size.depositValue })
    }
  }

  return result
}

// Suggested deposit lines for one invoice/quote line, from the article's
// consignment config — a starting point the create form lets someone edit
// (or override entirely), same as any other prefill in this app.
export function consignmentsForLine(article: Article, lineQuantity: number): ConsignmentCharge[] {
  const consignment = castJson<Consignment>(article.consignment)
  if (!consignment.enabled) return []
  return pickPackagingContainers(consignment.packaging, lineQuantity)
}

// Sum of physical units a set of chosen containers actually covers, so a
// create form can warn when someone has edited the packaging selection
// down below what the line's own quantity requires.
export function coveredQuantity(consignments: Pick<ConsignmentCharge, "units_per_article" | "quantity">[]): number {
  return consignments.reduce((s, c) => s + c.units_per_article * c.quantity, 0)
}

// ============================================
// DELIVERIES
// ============================================

type DeliveryInput = {
  number: string
  date?: string
  organization_id: string
  counterparty_id: string
  driver_name?: string | null
  vehicle_registration?: string | null
  status?: DocumentStatus
  source_quote_id?: string | null
}

export async function getDeliveries(organizationId?: string): Promise<Delivery[]> {
  const supabase = createClient()
  let query = supabase.from("documents").select("*").eq("kind", "delivery").order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// A quote can reasonably produce more than one delivery over time (partial
// shipments), so this returns all of them via the derived link
// (deliveries.source_document_id) rather than a single stored pointer.
export async function getDeliveriesBySourceQuote(quoteId: string): Promise<Delivery[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("kind", "delivery")
    .eq("source_document_id", quoteId)
    .order("date", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getDelivery(id: string): Promise<Delivery | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).eq("kind", "delivery").single()
  if (error) throw error
  return data
}

export async function getDeliveryLines(deliveryId: string): Promise<DeliveryLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("document_lines")
    .select("*")
    .eq("document_id", deliveryId)

  if (error) throw error
  return data || []
}

type DeliveryLineInput = Pick<DeliveryLine, "article_id" | "code" | "designation" | "unit" | "quantity">

export async function createDelivery(
  delivery: DeliveryInput,
  lines: DeliveryLineInput[]
): Promise<{ delivery: Delivery; updatedArticles: Article[] }> {
  const supabase = createClient()

  const attributes: DocumentAttributes = {
    driver_name: delivery.driver_name ?? null,
    vehicle_registration: delivery.vehicle_registration ?? null,
  }

  const { data: del, error: delError } = await supabase
    .from("documents")
    .insert({
      kind: "delivery",
      flow: "sale",
      number: delivery.number,
      date: delivery.date,
      organization_id: delivery.organization_id,
      counterparty_id: delivery.counterparty_id,
      status: delivery.status || "draft",
      source_document_id: delivery.source_quote_id,
      attributes,
    })
    .select()
    .single()

  if (delError) throw delError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("document_lines")
      .insert(lines.map((l) => ({ ...l, document_id: del.id, unit_price_excl_tax: 0, discount_percent: 0, tax_charges: [], consignments: [] })))

    if (linesError) throw linesError
  }

  const updatedArticles = await recordDeliveryStockMovements(del.organization_id, del.id, del.date, lines)

  return { delivery: del, updatedArticles }
}

// ============================================
// ORDERS
// ============================================

type OrderInput = {
  number: string
  date?: string
  organization_id: string
  counterparty_id: string
  type: OrderType
  status?: DocumentStatus
}

export async function getOrders(organizationId?: string): Promise<Order[]> {
  const supabase = createClient()
  let query = supabase.from("documents").select("*").eq("kind", "order").order("date", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).eq("kind", "order").single()
  if (error) throw error
  return data
}

export async function getOrderLines(orderId: string): Promise<OrderLine[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("document_lines")
    .select("*")
    .eq("document_id", orderId)

  if (error) throw error
  return data || []
}

type OrderLineInput = Pick<OrderLine, "code" | "designation" | "unit" | "quantity"> & {
  article_id?: string | null
  unit_price_excl_tax?: number | null
}

export async function createOrder(
  order: OrderInput,
  lines: OrderLineInput[]
): Promise<Order> {
  const supabase = createClient()

  const { data: ord, error: ordError } = await supabase
    .from("documents")
    .insert({
      kind: "order",
      subtype: order.type,
      flow: order.type === "customer" ? "sale" : "purchase",
      number: order.number,
      date: order.date,
      organization_id: order.organization_id,
      counterparty_id: order.counterparty_id,
      status: order.status || "draft",
    })
    .select()
    .single()

  if (ordError) throw ordError

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("document_lines")
      .insert(lines.map((l) => ({
        code: l.code,
        designation: l.designation,
        unit: l.unit,
        quantity: l.quantity,
        article_id: l.article_id ?? null,
        unit_price_excl_tax: l.unit_price_excl_tax ?? 0,
        discount_percent: 0,
        tax_charges: [],
        consignments: [],
        document_id: ord.id,
      })))

    if (linesError) throw linesError
  }

  return ord
}

// Whether an order has been invoiced is always a derived lookup (does any
// invoice reference it via source_document_id), never a stored pointer on
// the order — same rule as Quote->Invoice/Quote->Delivery, and correctly
// allows more than one invoice per order later (partial invoicing,
// corrections).
export async function getInvoiceBySourceOrder(orderId: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("kind", "invoice")
    .eq("source_document_id", orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Marks an order final once its resulting invoice has actually been saved
// (see the invoice create form's sourceOrderId prefill flow) — a plain
// status flip, not the link itself (that's documents.source_document_id).
export async function markOrderFinal(orderId: string): Promise<Order> {
  const supabase = createClient()
  const { data, error } = await supabase.from("documents").update({ status: "final" }).eq("id", orderId).select().single()
  if (error) throw error
  return data
}

// ============================================
// ISSUES — not part of the documents merge (stock-only, never touches
// money), so this stays exactly as before, querying its own tables.
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

type IssueLineInput = Pick<IssueLine, "code" | "designation" | "unit" | "quantity"> & {
  article_id?: string | null
}

export async function createIssue(
  issue: Omit<Issue, "id" | "created_at">,
  lines: IssueLineInput[]
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
      .insert(lines.map((l) => ({ ...l, article_id: l.article_id ?? null, issue_id: iss.id })))

    if (linesError) throw linesError
  }

  return iss
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function computeInvoiceTotals(lines: {
  unit_price_excl_tax: number
  discount_percent?: number | null
  quantity: number
  transfer_price?: number | null
  tax_charges: TaxCharge[]
}[]) {
  let subtotalExclTax = 0
  const chargesByKey: Record<string, number> = {}
  let totalInclTax = 0

  for (const line of lines) {
    const discount = line.discount_percent ? (line.unit_price_excl_tax * line.discount_percent) / 100 : 0
    const ht = (line.unit_price_excl_tax - discount) * line.quantity
    const transferAmount = (line.transfer_price || 0) * line.quantity

    subtotalExclTax += ht

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
    totalInclTax += lineTotal
  }

  return { subtotal_excl_tax: subtotalExclTax, chargesByKey, total_incl_tax: totalInclTax }
}
