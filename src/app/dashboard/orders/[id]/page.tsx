"use client"

import { use, useState, useEffect } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getOrder, getOrderLines, getInvoiceBySourceOrder } from "@/lib/supabase/invoices"
import { isSelfIssued } from "@/lib/documents/print-config"
import { DocumentAttachments } from "@/components/document-attachments"
import type { Invoice, Order, OrderLine } from "@/types/database"

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts } = useContactsStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [lines, setLines] = useState<OrderLine[]>([])
  const [linkedInvoice, setLinkedInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const o = await getOrder(id)
        setOrder(o)
        if (o) {
          const [lns, inv] = await Promise.all([getOrderLines(o.id), getInvoiceBySourceOrder(o.id)])
          setLines(lns)
          setLinkedInvoice(inv)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const counterparty = order ? contacts.find((c) => c.id === order.counterparty_id) : null

  if (loading) return <div className="text-muted-foreground">Chargement...</div>

  if (!order) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Commande introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/orders")}>Retour aux commandes</Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.number}</h1>
          <p className="text-muted-foreground">{order.date}</p>
        </div>
        <div className="flex gap-2">
          {isSelfIssued("order", order) && (
            <Button variant="outline" onClick={() => router.push(`/documents/order/${order.id}`)}>
              Print / PDF
            </Button>
          )}
          {!linkedInvoice && (
            <Button onClick={() => router.push(`/dashboard/invoices/create/standard?sourceOrderId=${order.id}`)}>
              Confirm Invoice
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>Retour</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>En-tête</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Tiers :</span> {counterparty?.company_name || "N/A"}</div>
          <div><span className="text-muted-foreground">Type :</span> <Badge variant="outline">{order.subtype}</Badge></div>
          <div><span className="text-muted-foreground">Statut :</span> <Badge>{order.status}</Badge></div>
          {linkedInvoice && (
            <div>
              <span className="text-muted-foreground">Facture :</span>{" "}
              <button className="underline hover:no-underline" onClick={() => router.push(`/dashboard/invoices/${linkedInvoice.id}`)}>
                View invoice
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lignes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Désignation</th>
                <th className="text-right p-2">Qté</th>
                <th className="text-left p-2">Unité</th>
                <th className="text-right p-2">Prix</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="p-2">{line.code}</td>
                  <td className="p-2">{line.designation}</td>
                  <td className="p-2 text-right">{line.quantity}</td>
                  <td className="p-2">{line.unit || "-"}</td>
                  <td className="p-2 text-right">{line.unit_price_excl_tax ?? "-"}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={5} className="text-center p-4 text-muted-foreground">Aucune ligne</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <DocumentAttachments documentType="order" documentId={order.id} organizationId={order.organization_id} />
    </div>
  )
}
