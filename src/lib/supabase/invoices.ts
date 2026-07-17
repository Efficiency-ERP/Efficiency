import { createClient } from "@/lib/supabase/client"
import type { Invoice, InvoiceLine, ConsignmentLine, Delivery, DeliveryLine, Order, OrderLine, Issue, IssueLine, TaxCharge } from "@/types/database"

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

export async function createInvoice(
  invoice: Omit<Invoice, "id" | "created_at" | "totals">,
  lines: (Omit<InvoiceLine, "id" | "invoice_id"> & { transfer_price?: number })[],
  consignments: Omit<ConsignmentLine, "id" | "invoice_id">[]
): Promise<Invoice> {
  const supabase = createClient()

  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .insert(invoice)
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

  const totals = computeInvoiceTotals(lines.map((l) => ({ ...l, tax_charges: l.tax_charges as unknown as TaxCharge[] })))
  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({ totals })
    .eq("id", inv.id)
    .select()
    .single()

  if (updateError) throw updateError
  return updated
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markInvoicePaid(id: string): Promise<Invoice> {
  return updateInvoice(id, { status: "paid" })
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  return updateInvoice(id, { status: "cancelled" })
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
): Promise<Delivery> {
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

  return del
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

export function generateInvoiceNumber(): string {
  const num = Math.floor(Math.random() * 10000)
  return `INV-${num.toString().padStart(4, "0")}`
}

export function generateDeliveryNumber(): string {
  const num = Math.floor(Math.random() * 10000)
  return `BL-${num.toString().padStart(4, "0")}`
}

export function generateOrderNumber(): string {
  const num = Math.floor(Math.random() * 10000)
  return `BC-${num.toString().padStart(4, "0")}`
}

export function generateIssueNumber(): string {
  const num = Math.floor(Math.random() * 10000)
  return `BS-${num.toString().padStart(4, "0")}`
}
