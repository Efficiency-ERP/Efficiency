"use client"

import { use, useState, useEffect } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getOrder, getOrderLines } from "@/lib/supabase/invoices"
import type { Order, OrderLine } from "@/types/database"

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts } = useContactsStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [lines, setLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const o = await getOrder(id)
        setOrder(o)
        if (o) {
          const lns = await getOrderLines(o.id)
          setLines(lns)
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

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  if (!order) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Order not found</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/orders/create")}>Back to orders</Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.number}</h1>
          <p className="text-muted-foreground">{order.date}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Counterparty:</span> {counterparty?.company_name || "N/A"}</div>
          <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{order.type}</Badge></div>
          <div><span className="text-muted-foreground">Status:</span> <Badge>{order.status}</Badge></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Designation</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-right p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="p-2">{line.code}</td>
                  <td className="p-2">{line.designation}</td>
                  <td className="p-2 text-right">{line.quantity}</td>
                  <td className="p-2">{line.unit || "-"}</td>
                  <td className="p-2 text-right">{line.unit_price ?? "-"}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={5} className="text-center p-4 text-muted-foreground">No lines</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
