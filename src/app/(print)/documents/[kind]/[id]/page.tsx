"use client"

import { use, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  buildDocumentViewModel,
  lineConsignmentViews,
  type DocumentSheetViewModel,
  type DocumentSource,
} from "@/lib/documents/view-model"
import {
  PRINT_KIND_CONFIG,
  documentTitle,
  isPrintableKind,
  isSelfIssued,
  type PrintableKind,
} from "@/lib/documents/print-config"
import {
  getConsignments,
  getDelivery,
  getDeliveryLines,
  getInvoice,
  getInvoiceLines,
  getIssue,
  getIssueLines,
  getOrder,
  getOrderLines,
  getQuote,
  getQuoteLines,
} from "@/lib/supabase/invoices"
import { getContact, getOrganization, getOrganizationLogoDataUrl } from "@/lib/supabase/contacts"
import type { ConsignmentLine } from "@/types/database"

// @react-pdf/renderer builds the PDF in the browser, so it must never be
// pulled into the server bundle.
const PdfPreview = dynamic(() => import("@/components/print/pdf-preview").then((m) => m.PdfPreview), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm text-neutral-500">Chargement du document…</div>,
})

interface LoadedSource {
  source: DocumentSource
  consignments: ConsignmentLine[]
}

async function loadSource(kind: PrintableKind, id: string): Promise<LoadedSource | null> {
  switch (kind) {
    case "invoice": {
      const doc = await getInvoice(id)
      if (!doc) return null
      const [lines, consignments] = await Promise.all([getInvoiceLines(id), getConsignments(id)])
      return { source: { kind, document: doc, lines }, consignments }
    }
    case "quote": {
      const doc = await getQuote(id)
      if (!doc) return null
      const lines = await getQuoteLines(id)
      return { source: { kind, document: doc, lines }, consignments: [] }
    }
    case "delivery": {
      const doc = await getDelivery(id)
      if (!doc) return null
      const lines = await getDeliveryLines(id)
      return { source: { kind, document: doc, lines }, consignments: [] }
    }
    case "order": {
      const doc = await getOrder(id)
      if (!doc) return null
      const lines = await getOrderLines(id)
      return { source: { kind, document: doc, lines }, consignments: [] }
    }
    case "issue": {
      const doc = await getIssue(id)
      if (!doc) return null
      const lines = await getIssueLines(id)
      return { source: { kind, document: doc, lines }, consignments: [] }
    }
  }
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; vm: DocumentSheetViewModel }

export default function DocumentPrintPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>
}) {
  const { kind: rawKind, id } = use(params)
  const [state, setState] = useState<LoadState>({ status: "loading" })

  const kind = isPrintableKind(rawKind) ? rawKind : null

  useEffect(() => {
    if (!kind) {
      setState({ status: "error", message: "Type de document inconnu." })
      return
    }

    let cancelled = false

    async function load(printableKind: PrintableKind) {
      try {
        const loaded = await loadSource(printableKind, id)
        if (!loaded) {
          if (!cancelled) setState({ status: "error", message: "Document introuvable." })
          return
        }

        const { source, consignments } = loaded
        const doc = source.document

        // A document our org didn't issue is the counterparty's paperwork —
        // printing it as ours would misrepresent who issued it.
        const selfIssued = isSelfIssued(
          printableKind,
          source.kind === "issue" ? {} : { flow: source.document.flow, subtype: source.document.subtype }
        )
        if (!selfIssued) {
          if (!cancelled) {
            setState({
              status: "error",
              message: "Ce document n'a pas été émis par votre organisation et ne peut pas être imprimé ici.",
            })
          }
          return
        }

        const [issuer, counterparty] = await Promise.all([
          getOrganization(doc.organization_id),
          getContact(doc.counterparty_id),
        ])

        const issuerLogo = issuer?.logo_path ? await getOrganizationLogoDataUrl(issuer.logo_path) : null

        const base = buildDocumentViewModel(source, { issuer, counterparty, issuerLogo }, consignments)

        // Quotes hold consignment estimates on their own lines rather than in
        // the posted consignment_lines ledger an invoice has.
        const vm = source.kind === "quote" && base.consignments.length === 0
          ? { ...base, consignments: lineConsignmentViews(source.lines) }
          : base

        if (!cancelled) setState({ status: "ready", vm })
      } catch (err) {
        console.error("Failed to load document for printing:", err)
        if (!cancelled) setState({ status: "error", message: "Document introuvable." })
      }
    }

    load(kind)
    return () => {
      cancelled = true
    }
  }, [kind, id])

  // Browsers use the page title as the default filename when saving to PDF.
  useEffect(() => {
    if (state.status !== "ready") return
    const previous = document.title
    document.title = `${documentTitle(state.vm.kind, state.vm.subtype)} ${state.vm.number}`
    return () => {
      document.title = previous
    }
  }, [state])

  if (state.status === "loading") {
    return <div className="p-8 text-center text-sm text-neutral-500">Chargement du document…</div>
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-neutral-700">{state.message}</p>
        <Link
          href={kind ? PRINT_KIND_CONFIG[kind].listRoute : "/dashboard"}
          className="mt-4 inline-block text-sm underline hover:no-underline"
        >
          Retour
        </Link>
      </div>
    )
  }

  const detailRoute = `${PRINT_KIND_CONFIG[state.vm.kind].listRoute}/${id}`

  return <PdfPreview vm={state.vm} backHref={detailRoute} />
}
