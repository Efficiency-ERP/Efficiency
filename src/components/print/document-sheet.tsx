import { formatTND, paymentMethodLabel } from "@/lib/utils"
import { formatTaxCharges } from "@/components/tax-charges-editor"
import { amountInWordsTND } from "@/lib/documents/amount-in-words"
import { PRINT_KIND_CONFIG, documentTitle } from "@/lib/documents/print-config"
import type { ChargeView, DocumentSheetViewModel, PartyView } from "@/lib/documents/view-model"

// Colours here are deliberately explicit rather than theme tokens: this sheet
// must look identical on screen and on paper, and must not follow the app into
// dark mode (a black invoice is not a document anyone can send).

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function PartyBlock({
  heading,
  party,
  showTaxId,
}: {
  heading: string
  party: PartyView | null
  showTaxId: boolean
}) {
  return (
    <div className="flex-1 border border-neutral-300 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{heading}</div>
      {party ? (
        <div className="space-y-0.5 text-[11px] leading-snug">
          <div className="text-[13px] font-semibold">{party.name}</div>
          {party.addressLine1 && <div>{party.addressLine1}</div>}
          {(party.zipCode || party.city) && (
            <div>{[party.zipCode, party.city].filter(Boolean).join(" ")}</div>
          )}
          {party.country && <div>{party.country}</div>}
          {party.phone && <div>Tél : {party.phone}</div>}
          {showTaxId && <div className="pt-1 font-medium">M.F. : {party.taxId || "—"}</div>}
          {showTaxId && party.registrationNumber && <div>R.C. : {party.registrationNumber}</div>}
        </div>
      ) : (
        <div className="text-[11px] text-neutral-400">Non renseigné</div>
      )}
    </div>
  )
}

function LineTable({ vm, showPrices }: { vm: DocumentSheetViewModel; showPrices: boolean }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-neutral-100 text-left">
          <th className="border border-neutral-300 px-2 py-1.5 font-semibold">Code</th>
          <th className="border border-neutral-300 px-2 py-1.5 font-semibold">Désignation</th>
          <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Qté</th>
          <th className="border border-neutral-300 px-2 py-1.5 font-semibold">Unité</th>
          {showPrices && (
            <>
              <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">P.U. HT</th>
              <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Rem.</th>
              <th className="border border-neutral-300 px-2 py-1.5 font-semibold">Taxes</th>
              <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Total HT</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {vm.lines.length === 0 ? (
          <tr>
            <td colSpan={showPrices ? 8 : 4} className="border border-neutral-300 px-2 py-6 text-center text-neutral-400">
              Aucune ligne
            </td>
          </tr>
        ) : (
          vm.lines.map((line) => (
            <tr key={line.id} className="avoid-break">
              <td className="border border-neutral-300 px-2 py-1.5 align-top">{line.code}</td>
              <td className="border border-neutral-300 px-2 py-1.5 align-top">{line.designation}</td>
              <td className="border border-neutral-300 px-2 py-1.5 text-right align-top">{line.quantity}</td>
              <td className="border border-neutral-300 px-2 py-1.5 align-top">{line.unit || "—"}</td>
              {showPrices && (
                <>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right align-top">
                    {formatTND(line.unitPriceExclTax)}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right align-top">
                    {line.discountPercent ? `${line.discountPercent} %` : "—"}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 align-top">
                    {formatTaxCharges(line.taxCharges) || "—"}
                  </td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right align-top">
                    {formatTND(line.totalExclTax)}
                  </td>
                </>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function TotalsBlock({ subtotal, charges, total }: { subtotal: number; charges: ChargeView[]; total: number }) {
  return (
    <div className="avoid-break flex justify-end">
      <table className="w-[75mm] border-collapse text-[11px]">
        <tbody>
          <tr>
            <td className="border border-neutral-300 px-2 py-1.5">Total HT</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{formatTND(subtotal)}</td>
          </tr>
          {charges.map((charge) => (
            <tr key={`${charge.label}-${charge.rate ?? "fixed"}`}>
              <td className="border border-neutral-300 px-2 py-1.5">
                {charge.label}
                {charge.rate !== null ? ` ${charge.rate} %` : ""}
              </td>
              <td className="border border-neutral-300 px-2 py-1.5 text-right">{formatTND(charge.amount)}</td>
            </tr>
          ))}
          <tr className="bg-neutral-100 font-semibold">
            <td className="border border-neutral-300 px-2 py-1.5">Total TTC</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right">{formatTND(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function DocumentSheet({ vm }: { vm: DocumentSheetViewModel }) {
  const config = PRINT_KIND_CONFIG[vm.kind]
  const title = documentTitle(vm.kind, vm.subtype)
  const showTotals = config.showTotals && vm.totals !== null
  const salesTerms = vm.issuer?.salesTerms || vm.counterparty?.salesTerms

  return (
    <div className="print-sheet mx-auto w-[210mm] bg-white p-[14mm] text-black shadow-sm print:w-auto print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-800 pb-3">
        <div>
          <div className="text-[18px] font-bold leading-tight">{vm.issuer?.name || "—"}</div>
          <div className="mt-1 space-y-0.5 text-[10px] leading-snug text-neutral-600">
            {vm.issuer?.addressLine1 && <div>{vm.issuer.addressLine1}</div>}
            {(vm.issuer?.zipCode || vm.issuer?.city) && (
              <div>{[vm.issuer?.zipCode, vm.issuer?.city, vm.issuer?.country].filter(Boolean).join(" · ")}</div>
            )}
            <div>
              {vm.issuer?.phone ? `Tél : ${vm.issuer.phone}` : null}
              {vm.issuer?.phone && vm.issuer?.taxId ? " · " : null}
              {vm.issuer?.taxId ? `M.F. : ${vm.issuer.taxId}` : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-bold uppercase tracking-wide">{title}</div>
          <div className="mt-1 text-[11px]">
            <div>
              N° <span className="font-semibold">{vm.number}</span>
            </div>
            <div>Date : {formatDate(vm.date)}</div>
            {config.showDueDate && <div>Échéance : {formatDate(vm.dueDate)}</div>}
          </div>
        </div>
      </header>

      <section className="mt-4 flex gap-3">
        <PartyBlock heading="Émetteur" party={vm.issuer} showTaxId={config.showTaxIds} />
        <PartyBlock heading={config.counterpartyLabel} party={vm.counterparty} showTaxId={config.showTaxIds} />
      </section>

      {config.showDeliveryDetails && (vm.driverName || vm.vehicleRegistration) && (
        <section className="mt-3 flex gap-6 border border-neutral-300 p-2 text-[11px]">
          {vm.driverName && (
            <div>
              <span className="text-neutral-500">Chauffeur : </span>
              {vm.driverName}
            </div>
          )}
          {vm.vehicleRegistration && (
            <div>
              <span className="text-neutral-500">Immatriculation : </span>
              {vm.vehicleRegistration}
            </div>
          )}
        </section>
      )}

      <section className="mt-4">
        <LineTable vm={vm} showPrices={config.showPrices} />
      </section>

      {config.showConsignments && vm.consignments.length > 0 && (
        <section className="avoid-break mt-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Consignations (emballages)
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="border border-neutral-300 px-2 py-1.5 font-semibold">Type</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Capacité</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Qté</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Caution unitaire</th>
                <th className="border border-neutral-300 px-2 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {vm.consignments.map((c, index) => (
                <tr key={`${c.packagingType}-${index}`} className="avoid-break">
                  <td className="border border-neutral-300 px-2 py-1.5">{c.packagingType}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{c.unitsPerArticle}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{c.quantity}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{formatTND(c.depositValue)}</td>
                  <td className="border border-neutral-300 px-2 py-1.5 text-right">{formatTND(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showTotals && vm.totals && (
        <section className="mt-4">
          <TotalsBlock
            subtotal={vm.totals.subtotalExclTax}
            charges={vm.totals.charges}
            total={vm.totals.totalInclTax}
          />
        </section>
      )}

      {config.showAmountInWords && vm.totals && (
        <section className="avoid-break mt-3 border border-neutral-300 p-2 text-[11px]">
          <span className="text-neutral-500">Arrêtée la présente facture à la somme de : </span>
          <span className="font-medium">{amountInWordsTND(vm.totals.totalInclTax)}</span>
        </section>
      )}

      {vm.notes && (
        <section className="avoid-break mt-3 text-[11px]">
          <div className="text-neutral-500">Notes</div>
          <div className="whitespace-pre-wrap">{vm.notes}</div>
        </section>
      )}

      <footer className="avoid-break mt-6 border-t border-neutral-300 pt-3 text-[10px] text-neutral-600">
        {config.showPaymentMethod && (
          <div>Mode de paiement : {paymentMethodLabel(vm.paymentMethod)}</div>
        )}
        {salesTerms && <div>Conditions : {salesTerms}</div>}
        {config.showSignatureBlock && (
          <div className="mt-6 flex justify-between gap-8">
            {/* Reserved for the TTN reference / QR code once El Fatoora lands. */}
            <div className="h-[22mm] w-[45mm] border border-dashed border-neutral-300 p-1 text-center text-[8px] text-neutral-400">
              Réservé — référence électronique
            </div>
            <div className="w-[55mm] text-center">
              <div className="h-[18mm] border-b border-neutral-400" />
              <div className="pt-1">Cachet et signature</div>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
