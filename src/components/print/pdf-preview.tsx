"use client"

import { usePDF } from "@react-pdf/renderer"
import Link from "next/link"
import { DocumentPdf } from "@/components/print/document-pdf"
import { documentTitle } from "@/lib/documents/print-config"
import type { DocumentSheetViewModel } from "@/lib/documents/view-model"

export function PdfPreview({ vm, backHref }: { vm: DocumentSheetViewModel; backHref: string }) {
  // The view model is fixed for the life of this page, so one render is enough.
  const [instance] = usePDF({ document: <DocumentPdf vm={vm} /> })

  const fileName = `${documentTitle(vm.kind, vm.subtype).replace(/\s+/g, "-")}-${vm.number}.pdf`

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between gap-4 border-b bg-white px-4 py-3">
        <Link href={backHref} className="text-sm underline hover:no-underline">
          ← Retour au document
        </Link>
        {instance.url && !instance.loading ? (
          <a
            href={instance.url}
            download={fileName}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Télécharger le PDF
          </a>
        ) : (
          <span className="text-sm text-neutral-500">
            {instance.error ? "Échec de la génération" : "Génération du PDF…"}
          </span>
        )}
      </div>

      <div className="flex-1 bg-neutral-100">
        {instance.error ? (
          <div className="p-8 text-center text-sm text-red-700">
            Le PDF n&apos;a pas pu être généré.
          </div>
        ) : instance.url ? (
          <iframe src={instance.url} title={fileName} className="h-full w-full border-0" />
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">Génération du PDF…</div>
        )}
      </div>
    </div>
  )
}
