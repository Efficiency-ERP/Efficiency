// Status values are stored in English; these are what the UI shows.
//
// Invoices, bons de livraison and bons de sortie have no status to show:
// each is final the moment it is written.

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
}

// An order only becomes "final" when an invoice is created from it
// (markOrderFinal has no other caller), so "final" means invoiced.
const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  final: "Facturée",
}

export function quoteStatusLabel(status: string | null): string {
  return QUOTE_STATUS_LABELS[status || "draft"] ?? status ?? ""
}

export function orderStatusLabel(status: string | null): string {
  return ORDER_STATUS_LABELS[status || "draft"] ?? status ?? ""
}
