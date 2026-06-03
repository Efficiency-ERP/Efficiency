"use client"

import { use } from "react"
import { useArticlesStore } from "@/contexts/articles-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Stock, Consignment, ConsignmentPackaging } from "@/types/database"
import { formatTND } from "@/lib/utils"
import { useState } from "react"

export default function ArticleSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { articles, loading } = useArticlesStore()
  const article = articles.find((a) => a.id === id)
  const [qty, setQty] = useState(1)

  if (loading) return <div className="text-muted-foreground">Loading...</div>
  if (!article) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Article introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/articles")}>Back to articles</Button>
    </div>
  )

  const stock = article.stock as unknown as Stock
  const consignment = article.consignment as unknown as Consignment

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{article.code} — {article.designation}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{article.type}</Badge>
            {!article.active && <Badge variant="destructive">Inactive</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/articles/${id}/edit`)}>Edit Article</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Unit:</span> {article.unit || "N/A"}</div>
            <div><span className="text-muted-foreground">PUHT:</span> {formatTND(article.unit_price_puht)}</div>
            <div><span className="text-muted-foreground">Transfer Price:</span> {formatTND(article.transfer_price)}</div>
            <div><span className="text-muted-foreground">VAT:</span> {article.vat_rate}%</div>
            <div><span className="text-muted-foreground">DC:</span> {article.dc_rate}%</div>
          </CardContent>
        </Card>
        {article.type === "product" && (
          <Card>
            <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">On Hand:</span> {stock.onHand}</div>
              <div><span className="text-muted-foreground">Min Stock:</span> {stock.minStock}</div>
              <div>Status: {stock.onHand >= stock.minStock ? <Badge variant="default">OK</Badge> : <Badge variant="destructive">Below Min</Badge>}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {article.type === "product" && consignment.enabled && (
        <Card>
          <CardHeader><CardTitle>Consignment Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm">Quantity:</label>
              <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24 border rounded px-2 py-1" min={1} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b"><th className="text-left py-2">Type</th><th className="text-right py-2">Units/Art</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Deposit/Unit</th><th className="text-right py-2">Total</th></tr>
              </thead>
              <tbody>
                {consignment.packaging.map((pkg: ConsignmentPackaging, i: number) => {
                  const pkgQty = qty * pkg.unitsPerArticle
                  const total = pkgQty * pkg.depositValue
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2">{pkg.type}</td>
                      <td className="text-right py-2">{pkg.unitsPerArticle}</td>
                      <td className="text-right py-2">{pkgQty}</td>
                      <td className="text-right py-2">{formatTND(pkg.depositValue)}</td>
                      <td className="text-right py-2">{formatTND(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
