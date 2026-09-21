import type { DocumentFlow, InvoiceType } from "@/types/database"

// Issues live in their own table (stock-only, never financial), so the
// printable set is the four document kinds plus "issue".
export const PRINTABLE_KINDS = ["invoice", "quote", "delivery", "order", "issue"] as const
export type PrintableKind = (typeof PRINTABLE_KINDS)[number]

export function isPrintableKind(value: string): value is PrintableKind {
  return (PRINTABLE_KINDS as readonly string[]).includes(value)
}

export interface PrintKindConfig {
  /** Heading printed on the sheet. Invoices override this per subtype. */
  label: string
  /** Where the on-screen "back" action returns to. */
  listRoute: string
  counterpartyLabel: string
  showPrices: boolean
  showTaxIds: boolean
  showDueDate: boolean
  showPaymentMethod: boolean
  showTotals: boolean
  showAmountInWords: boolean
  showConsignments: boolean
  showDeliveryDetails: boolean
  /** The RIB block a customer needs to pay by virement. */
  showBankDetails: boolean
  /** Reserved footer area — becomes the TTN reference / QR block once El Fatoora lands. */
  showSignatureBlock: boolean
}

export const PRINT_KIND_CONFIG: Record<PrintableKind, PrintKindConfig> = {
  invoice: {
    label: "FACTURE",
    listRoute: "/dashboard/invoices",
    counterpartyLabel: "Client",
    showPrices: true,
    showTaxIds: true,
    showDueDate: true,
    showPaymentMethod: true,
    showTotals: true,
    showAmountInWords: true,
    showConsignments: true,
    showDeliveryDetails: false,
    showBankDetails: true,
    showSignatureBlock: true,
  },
  quote: {
    label: "DEVIS",
    listRoute: "/dashboard/quotes",
    counterpartyLabel: "Client",
    showPrices: true,
    showTaxIds: true,
    showDueDate: false,
    showPaymentMethod: false,
    showTotals: true,
    showAmountInWords: false,
    showConsignments: true,
    showDeliveryDetails: false,
    showBankDetails: false,
    showSignatureBlock: false,
  },
  delivery: {
    // A delivery note proves handover, so it carries quantities but no prices.
    label: "BON DE LIVRAISON",
    listRoute: "/dashboard/deliveries",
    counterpartyLabel: "Client",
    showPrices: false,
    showTaxIds: true,
    showDueDate: false,
    showPaymentMethod: false,
    showTotals: false,
    showAmountInWords: false,
    showConsignments: false,
    showDeliveryDetails: true,
    showBankDetails: false,
    showSignatureBlock: false,
  },
  order: {
    label: "BON DE COMMANDE",
    listRoute: "/dashboard/orders",
    counterpartyLabel: "Fournisseur",
    showPrices: true,
    showTaxIds: true,
    showDueDate: false,
    showPaymentMethod: false,
    showTotals: true,
    showAmountInWords: false,
    showConsignments: false,
    showDeliveryDetails: false,
    showBankDetails: false,
    showSignatureBlock: false,
  },
  issue: {
    // Internal stock movement — no counterparty pricing at all.
    label: "BON DE SORTIE",
    listRoute: "/dashboard/issues",
    counterpartyLabel: "Destinataire",
    showPrices: false,
    showTaxIds: false,
    showDueDate: false,
    showPaymentMethod: false,
    showTotals: false,
    showAmountInWords: false,
    showConsignments: false,
    showDeliveryDetails: false,
    showBankDetails: false,
    showSignatureBlock: false,
  },
}

const INVOICE_SUBTYPE_LABELS: Record<InvoiceType, string> = {
  standard: "FACTURE",
  credit: "FACTURE D'AVOIR",
  debit: "FACTURE DE DÉBIT",
}

export function documentTitle(kind: PrintableKind, subtype: string | null): string {
  if (kind === "invoice") {
    return INVOICE_SUBTYPE_LABELS[(subtype as InvoiceType) || "standard"] ?? "FACTURE"
  }
  return PRINT_KIND_CONFIG[kind].label
}

// Only documents our own org issued are printable: a purchase invoice or a
// customer order is the counterparty's paperwork, and reprinting it as if it
// were ours would be wrong. Quotes/invoices/deliveries are ours on the sale
// side; orders are ours when we're the one ordering (supplier/interco), never
// for a customer order; a goods issue is always internal.
export function isSelfIssued(
  kind: PrintableKind,
  doc: { flow?: DocumentFlow | null; subtype?: string | null }
): boolean {
  switch (kind) {
    case "invoice":
    case "quote":
    case "delivery":
      return doc.flow === "sale"
    case "order":
      return doc.subtype === "supplier" || doc.subtype === "interco"
    case "issue":
      return true
  }
}
