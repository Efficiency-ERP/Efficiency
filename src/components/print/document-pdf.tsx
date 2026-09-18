import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { formatTND, paymentMethodLabel } from "@/lib/utils"
import { amountInWordsTND } from "@/lib/documents/amount-in-words"
import { PRINT_KIND_CONFIG, documentTitle } from "@/lib/documents/print-config"
import type { ChargeView, DocumentSheetViewModel, LineView, PartyView } from "@/lib/documents/view-model"

// A real PDF rather than a printed web page: fixed A4 geometry, selectable
// text, and identical output on every browser and OS. Units are PDF points
// (1mm = 2.835pt), so 34pt is the 12mm margin a Tunisian invoice expects.
const MM = 2.83465
const mm = (value: number) => Math.round(value * MM * 100) / 100

// The base-14 PDF fonts are WinAnsi-encoded, which covers French accents but
// not the narrow no-break space some locales use as a group separator. Node
// and browser ICU builds disagree on which one they emit, so normalise.
function text(value: string): string {
  return value.replace(/[  ]/g, " ")
}

const money = (value: number) => text(formatTND(value))

const styles = StyleSheet.create({
  page: {
    paddingTop: mm(12),
    paddingBottom: mm(16),
    paddingHorizontal: mm(12),
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1f2937",
    paddingBottom: 8,
  },
  issuerName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  issuerMeta: { fontSize: 7.5, color: "#4b5563", marginTop: 3, lineHeight: 1.4 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  titleMeta: { fontSize: 8.5, marginTop: 4, textAlign: "right", lineHeight: 1.5 },

  parties: { flexDirection: "row", gap: 8, marginTop: 12 },
  party: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 6 },
  partyHeading: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyLine: { lineHeight: 1.4 },
  partyTaxId: { marginTop: 3, fontFamily: "Helvetica-Bold" },

  detailsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 5,
  },
  label: { color: "#6b7280" },

  table: { marginTop: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  row: { flexDirection: "row" },
  cell: {
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerCell: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },

  sectionHeading: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 3,
  },

  totals: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end" },
  totalsTable: { width: mm(75) },
  totalsRow: { flexDirection: "row" },
  totalsFinal: { backgroundColor: "#f3f4f6", fontFamily: "Helvetica-Bold" },

  words: { marginTop: 10, borderWidth: 1, borderColor: "#d1d5db", padding: 6 },
  notes: { marginTop: 10 },

  footer: { marginTop: 18, borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 6, fontSize: 7.5, color: "#4b5563" },
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  reserved: {
    width: mm(45),
    height: mm(22),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    padding: 3,
    fontSize: 6.5,
    color: "#9ca3af",
    textAlign: "center",
  },
  signatureBox: { width: mm(55), alignItems: "center" },
  signatureLine: { width: "100%", height: mm(18), borderBottomWidth: 1, borderBottomColor: "#9ca3af" },

  pageNumber: {
    position: "absolute",
    bottom: mm(8),
    left: mm(12),
    right: mm(12),
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
  },
})

const PRICED_COLUMNS = ["11%", "30%", "7%", "9%", "13%", "7%", "10%", "13%"]
const PLAIN_COLUMNS = ["15%", "55%", "13%", "17%"]

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function formatTaxes(line: LineView): string {
  if (line.taxCharges.length === 0) return "—"
  return line.taxCharges.map((c) => `${c.label} ${c.rate}%`).join(", ")
}

function PartyBox({ heading, party, showTaxId }: { heading: string; party: PartyView | null; showTaxId: boolean }) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyHeading}>{heading}</Text>
      {party ? (
        <View>
          <Text style={styles.partyName}>{party.name}</Text>
          {party.addressLine1 ? <Text style={styles.partyLine}>{party.addressLine1}</Text> : null}
          {party.zipCode || party.city ? (
            <Text style={styles.partyLine}>{[party.zipCode, party.city].filter(Boolean).join(" ")}</Text>
          ) : null}
          {party.country ? <Text style={styles.partyLine}>{party.country}</Text> : null}
          {party.phone ? <Text style={styles.partyLine}>Tél : {party.phone}</Text> : null}
          {showTaxId ? <Text style={styles.partyTaxId}>M.F. : {party.taxId || "—"}</Text> : null}
          {showTaxId && party.registrationNumber ? (
            <Text style={styles.partyLine}>R.C. : {party.registrationNumber}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: "#9ca3af" }}>Non renseigné</Text>
      )}
    </View>
  )
}

function LineTable({ lines, showPrices }: { lines: LineView[]; showPrices: boolean }) {
  const widths = showPrices ? PRICED_COLUMNS : PLAIN_COLUMNS
  const headings = showPrices
    ? ["Code", "Désignation", "Qté", "Unité", "P.U. HT", "Rem.", "Taxes", "Total HT"]
    : ["Code", "Désignation", "Qté", "Unité"]
  const numeric = showPrices ? [2, 4, 5, 7] : [2]

  return (
    <View style={styles.table}>
      {/* fixed repeats the header on every page the table spans */}
      <View style={styles.tableHeader} fixed>
        {headings.map((heading, index) => (
          <Text
            key={heading}
            style={[
              styles.cell,
              styles.headerCell,
              { width: widths[index] },
              numeric.includes(index) ? styles.right : {},
            ]}
          >
            {heading}
          </Text>
        ))}
      </View>

      {lines.length === 0 ? (
        <View style={styles.row}>
          <Text style={[styles.cell, { width: "100%", textAlign: "center", color: "#9ca3af", paddingVertical: 16 }]}>
            Aucune ligne
          </Text>
        </View>
      ) : (
        lines.map((line) => (
          <View key={line.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, { width: widths[0] }]}>{line.code}</Text>
            <Text style={[styles.cell, { width: widths[1] }]}>{line.designation}</Text>
            <Text style={[styles.cell, styles.right, { width: widths[2] }]}>{line.quantity}</Text>
            <Text style={[styles.cell, { width: widths[3] }]}>{line.unit || "—"}</Text>
            {showPrices ? (
              <>
                <Text style={[styles.cell, styles.right, { width: widths[4] }]}>{money(line.unitPriceExclTax)}</Text>
                <Text style={[styles.cell, styles.right, { width: widths[5] }]}>
                  {line.discountPercent ? `${line.discountPercent} %` : "—"}
                </Text>
                <Text style={[styles.cell, { width: widths[6] }]}>{formatTaxes(line)}</Text>
                <Text style={[styles.cell, styles.right, { width: widths[7] }]}>{money(line.totalExclTax)}</Text>
              </>
            ) : null}
          </View>
        ))
      )}
    </View>
  )
}

function TotalsBlock({ subtotal, charges, total }: { subtotal: number; charges: ChargeView[]; total: number }) {
  return (
    <View style={styles.totals} wrap={false}>
      <View style={styles.totalsTable}>
        <View style={styles.totalsRow}>
          <Text style={[styles.cell, { width: "60%" }]}>Total HT</Text>
          <Text style={[styles.cell, styles.right, { width: "40%" }]}>{money(subtotal)}</Text>
        </View>
        {charges.map((charge) => (
          <View key={`${charge.label}-${charge.rate ?? "fixed"}`} style={styles.totalsRow}>
            <Text style={[styles.cell, { width: "60%" }]}>
              {charge.label}
              {charge.rate !== null ? ` ${charge.rate} %` : ""}
            </Text>
            <Text style={[styles.cell, styles.right, { width: "40%" }]}>{money(charge.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalsRow}>
          <Text style={[styles.cell, styles.totalsFinal, { width: "60%" }]}>Total TTC</Text>
          <Text style={[styles.cell, styles.totalsFinal, styles.right, { width: "40%" }]}>{money(total)}</Text>
        </View>
      </View>
    </View>
  )
}

export function DocumentPdf({ vm }: { vm: DocumentSheetViewModel }) {
  const config = PRINT_KIND_CONFIG[vm.kind]
  const title = documentTitle(vm.kind, vm.subtype)
  const salesTerms = vm.issuer?.salesTerms || vm.counterparty?.salesTerms

  return (
    <Document title={`${title} ${vm.number}`} author={vm.issuer?.name || "Efficiency"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.issuerName}>{vm.issuer?.name || "—"}</Text>
            <View style={styles.issuerMeta}>
              {vm.issuer?.addressLine1 ? <Text>{vm.issuer.addressLine1}</Text> : null}
              {vm.issuer?.zipCode || vm.issuer?.city ? (
                <Text>{[vm.issuer?.zipCode, vm.issuer?.city, vm.issuer?.country].filter(Boolean).join(" · ")}</Text>
              ) : null}
              {vm.issuer?.phone || vm.issuer?.taxId ? (
                <Text>
                  {[
                    vm.issuer?.phone ? `Tél : ${vm.issuer.phone}` : null,
                    vm.issuer?.taxId ? `M.F. : ${vm.issuer.taxId}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleMeta}>
              <Text>N° {vm.number}</Text>
              <Text>Date : {formatDate(vm.date)}</Text>
              {config.showDueDate ? <Text>Échéance : {formatDate(vm.dueDate)}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <PartyBox heading="Émetteur" party={vm.issuer} showTaxId={config.showTaxIds} />
          <PartyBox heading={config.counterpartyLabel} party={vm.counterparty} showTaxId={config.showTaxIds} />
        </View>

        {config.showDeliveryDetails && (vm.driverName || vm.vehicleRegistration) ? (
          <View style={styles.detailsRow}>
            {vm.driverName ? (
              <Text>
                <Text style={styles.label}>Chauffeur : </Text>
                {vm.driverName}
              </Text>
            ) : null}
            {vm.vehicleRegistration ? (
              <Text>
                <Text style={styles.label}>Immatriculation : </Text>
                {vm.vehicleRegistration}
              </Text>
            ) : null}
          </View>
        ) : null}

        <LineTable lines={vm.lines} showPrices={config.showPrices} />

        {config.showConsignments && vm.consignments.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Consignations (emballages)</Text>
            <View>
              <View style={styles.tableHeader}>
                {["Type", "Capacité", "Qté", "Caution unitaire", "Total"].map((heading, index) => (
                  <Text
                    key={heading}
                    style={[
                      styles.cell,
                      styles.headerCell,
                      { width: index === 0 ? "28%" : "18%" },
                      index === 0 ? {} : styles.right,
                    ]}
                  >
                    {heading}
                  </Text>
                ))}
              </View>
              {vm.consignments.map((c, index) => (
                <View key={`${c.packagingType}-${index}`} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, { width: "28%" }]}>{c.packagingType}</Text>
                  <Text style={[styles.cell, styles.right, { width: "18%" }]}>{c.unitsPerArticle}</Text>
                  <Text style={[styles.cell, styles.right, { width: "18%" }]}>{c.quantity}</Text>
                  <Text style={[styles.cell, styles.right, { width: "18%" }]}>{money(c.depositValue)}</Text>
                  <Text style={[styles.cell, styles.right, { width: "18%" }]}>{money(c.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {config.showTotals && vm.totals ? (
          <TotalsBlock
            subtotal={vm.totals.subtotalExclTax}
            charges={vm.totals.charges}
            total={vm.totals.totalInclTax}
          />
        ) : null}

        {config.showAmountInWords && vm.totals ? (
          <View style={styles.words} wrap={false}>
            <Text>
              <Text style={styles.label}>Arrêtée la présente facture à la somme de : </Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{amountInWordsTND(vm.totals.totalInclTax)}</Text>
            </Text>
          </View>
        ) : null}

        {vm.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text>{vm.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} wrap={false}>
          {config.showPaymentMethod ? <Text>Mode de paiement : {paymentMethodLabel(vm.paymentMethod)}</Text> : null}
          {salesTerms ? <Text>Conditions : {salesTerms}</Text> : null}
          {config.showSignatureBlock ? (
            <View style={styles.signatures}>
              {/* Reserved for the TTN reference / QR code once El Fatoora lands. */}
              <Text style={styles.reserved}>Réservé — référence électronique</Text>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={{ marginTop: 3 }}>Cachet et signature</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
