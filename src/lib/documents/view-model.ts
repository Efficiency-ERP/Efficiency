import { castJson } from "@/lib/utils"
import type {
  ConsignmentLine,
  Contact,
  Document,
  DocumentAttributes,
  DocumentLine,
  InvoiceTotals,
  Issue,
  IssueLine,
  Organization,
  PaymentMethod,
  TaxCharge,
} from "@/types/database"
import type { PrintableKind } from "./print-config"

// The presentation-agnostic shape a printed document is built from. Everything
// here is raw data — numbers, ISO dates, unformatted identifiers — never
// formatted strings or French labels. Formatting belongs to the sheet
// component; this structure is also what a future TEIF XML serializer should
// read, so keeping it free of presentation is the whole point.

export interface PartyView {
  name: string
  /** Matricule fiscal, unformatted. */
  taxId: string | null
  registrationNumber: string | null
  addressLine1: string | null
  city: string | null
  zipCode: string | null
  country: string | null
  phone: string | null
  fax: string | null
  salesTerms: string | null
}

export interface LineView {
  id: string
  code: string
  designation: string
  unit: string | null
  quantity: number
  unitPriceExclTax: number
  discountPercent: number
  taxCharges: TaxCharge[]
  totalExclTax: number
}

export interface ChargeView {
  label: string
  /** Percentage rate where the charge is rate-based, null otherwise. */
  rate: number | null
  amount: number
}

export interface TotalsView {
  subtotalExclTax: number
  charges: ChargeView[]
  totalInclTax: number
}

export interface ConsignmentView {
  packagingType: string
  unitsPerArticle: number
  quantity: number
  depositValue: number
  total: number
}

export interface DocumentSheetViewModel {
  kind: PrintableKind
  subtype: string | null
  number: string
  /** ISO date (yyyy-mm-dd) as stored. */
  date: string
  dueDate: string | null
  status: string | null
  issuer: PartyView | null
  counterparty: PartyView | null
  lines: LineView[]
  /** Null for kinds that carry no monetary totals (goods issues). */
  totals: TotalsView | null
  consignments: ConsignmentView[]
  paymentMethod: PaymentMethod | null
  driverName: string | null
  vehicleRegistration: string | null
  notes: string | null
}

export type DocumentSource =
  | { kind: "invoice" | "quote" | "delivery" | "order"; document: Document; lines: DocumentLine[] }
  | { kind: "issue"; document: Issue; lines: IssueLine[] }

interface JsonAddress {
  line1?: string | null
  city?: string | null
  zipCode?: string | null
  country?: string | null
}

interface JsonContactDetails {
  phone?: string | null
  fax?: string | null
}

function organizationParty(org: Organization | null): PartyView | null {
  if (!org) return null
  const address = castJson<JsonAddress>(org.address) || {}
  const details = castJson<JsonContactDetails>(org.contact) || {}
  return {
    name: org.name,
    taxId: org.mf,
    registrationNumber: org.unique_id,
    addressLine1: address.line1 || null,
    city: address.city || null,
    zipCode: address.zipCode || null,
    country: address.country || null,
    phone: details.phone || null,
    fax: details.fax || null,
    salesTerms: org.conditions_de_vente,
  }
}

function contactParty(contact: Contact | null): PartyView | null {
  if (!contact) return null
  const address = castJson<JsonAddress>(contact.address) || {}
  const details = castJson<JsonContactDetails>(contact.contact) || {}
  return {
    name: contact.company_name,
    taxId: contact.mf,
    registrationNumber: contact.unique_id,
    addressLine1: address.line1 || null,
    city: address.city || null,
    zipCode: address.zipCode || null,
    country: address.country || null,
    phone: details.phone || null,
    fax: details.fax || null,
    salesTerms: contact.conditions_de_vente,
  }
}

function documentLineView(line: DocumentLine): LineView {
  const discountPercent = line.discount_percent || 0
  const discount = (line.unit_price_excl_tax * discountPercent) / 100
  return {
    id: line.id,
    code: line.code,
    designation: line.designation,
    unit: line.unit,
    quantity: line.quantity,
    unitPriceExclTax: line.unit_price_excl_tax,
    discountPercent,
    taxCharges: castJson<TaxCharge[]>(line.tax_charges) || [],
    totalExclTax: (line.unit_price_excl_tax - discount) * line.quantity,
  }
}

function issueLineView(line: IssueLine): LineView {
  return {
    id: line.id,
    code: line.code,
    designation: line.designation,
    unit: line.unit,
    quantity: line.quantity,
    unitPriceExclTax: 0,
    discountPercent: 0,
    taxCharges: [],
    totalExclTax: 0,
  }
}

// Charges come from the document's STORED totals rather than being recomputed
// from the lines. Two reasons: the stored figures are what the counterparty was
// actually invoiced (and an invoice is immutable), and charges with base
// "transfer" can't be recomputed at all — document_lines doesn't persist
// transfer_price. The cost is that chargesByKey is keyed by the display string
// `${label} ${rate}%`, so the label and rate have to be recovered from it;
// splitting on the last space keeps multi-word labels ("TVA réduite 7%") intact.
function parseStoredCharges(chargesByKey: Record<string, number>): ChargeView[] {
  return Object.entries(chargesByKey).map(([key, amount]) => {
    const lastSpace = key.lastIndexOf(" ")
    const tail = lastSpace === -1 ? "" : key.slice(lastSpace + 1)

    if (tail.endsWith("%")) {
      const rate = Number(tail.slice(0, -1))
      if (Number.isFinite(rate)) {
        return { label: key.slice(0, lastSpace), rate, amount }
      }
    }
    return { label: key, rate: null, amount }
  })
}

function totalsView(totals: InvoiceTotals): TotalsView {
  return {
    subtotalExclTax: totals.subtotal_excl_tax || 0,
    charges: parseStoredCharges(totals.chargesByKey || {}),
    totalInclTax: totals.total_incl_tax || 0,
  }
}

function consignmentViews(consignments: ConsignmentLine[]): ConsignmentView[] {
  return consignments.map((c) => ({
    packagingType: c.packaging_type,
    unitsPerArticle: c.units_per_article,
    quantity: c.quantity,
    depositValue: c.deposit_value,
    total: c.total,
  }))
}

export function buildDocumentViewModel(
  source: DocumentSource,
  parties: { issuer: Organization | null; counterparty: Contact | null },
  consignments: ConsignmentLine[] = []
): DocumentSheetViewModel {
  const issuer = organizationParty(parties.issuer)
  const counterparty = contactParty(parties.counterparty)

  if (source.kind === "issue") {
    const { document, lines } = source
    return {
      kind: "issue",
      subtype: null,
      number: document.number,
      date: document.date,
      dueDate: null,
      status: document.status,
      issuer,
      counterparty,
      lines: lines.map(issueLineView),
      totals: null,
      consignments: [],
      paymentMethod: null,
      driverName: null,
      vehicleRegistration: null,
      notes: null,
    }
  }

  const { kind, document, lines } = source
  const attributes = castJson<DocumentAttributes>(document.attributes) || {}

  return {
    kind,
    subtype: document.subtype,
    number: document.number,
    date: document.date,
    dueDate: document.due_date,
    status: document.status,
    issuer,
    counterparty,
    lines: lines.map(documentLineView),
    totals: totalsView(castJson<InvoiceTotals>(document.totals) || {}),
    consignments: consignmentViews(consignments),
    paymentMethod: attributes.payment_method || null,
    driverName: attributes.driver_name || null,
    vehicleRegistration: attributes.vehicle_registration || null,
    notes: document.notes,
  }
}

// Quote lines carry their own consignment estimates in document_lines.consignments,
// whereas an invoice's real deposits live in the consignment_lines ledger. Same
// on-screen shape either way.
interface StoredLineConsignment {
  packaging_type?: string
  units_per_article?: number
  quantity?: number
  deposit_value?: number
  total?: number
}

export function lineConsignmentViews(lines: DocumentLine[]): ConsignmentView[] {
  const result: ConsignmentView[] = []
  for (const line of lines) {
    const entries = castJson<StoredLineConsignment[]>(line.consignments)
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      if (!entry?.packaging_type) continue
      result.push({
        packagingType: entry.packaging_type,
        unitsPerArticle: entry.units_per_article || 0,
        quantity: entry.quantity || 0,
        depositValue: entry.deposit_value || 0,
        total: entry.total || 0,
      })
    }
  }
  return result
}
