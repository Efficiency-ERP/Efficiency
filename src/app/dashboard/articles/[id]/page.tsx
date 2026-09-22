"use client"

import { use } from "react"
import { useArticlesStore } from "@/contexts/articles-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Stock, Consignment, TaxCharge } from "@/types/database"
import { formatTND, castJson } from "@/lib/utils"
import { formatTaxCharges } from "@/components/tax-charges-editor"
import { pickPackagingContainers } from "@/lib/supabase/invoices"
import { useState } from "react"

export default function ArticleSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { articles, loading } = useArticlesStore()
  const article = articles.find((a) => a.id === id)
  const [qty, setQty] = useState(1)

  if (loading) return <div className="text-muted-foreground">Chargement...</div>
  if (!article) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Article introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/articles")}>Retour aux articles</Button>
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
            {!article.active && <Badge variant="destructive">Inactif</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/articles/${id}/edit`)}>Modifier l&apos;article</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Unité :</span> {article.unit || "N/A"}</div>
            <div><span className="text-muted-foreground">PUHT :</span> {formatTND(article.unit_price_puht)}</div>
            <div><span className="text-muted-foreground">Prix de transfert :</span> {formatTND(article.transfer_price)}</div>
            <div><span className="text-muted-foreground">Taxes :</span> {formatTaxCharges(castJson<TaxCharge[]>(article.tax_charges))}</div>
          </CardContent>
        </Card>
        {article.type === "product" && (
          <Card>
            <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">En stock :</span> {stock.onHand}</div>
              <div><span className="text-muted-foreground">Stock min :</span> {stock.minStock}</div>
              <div>Status: {stock.onHand >= stock.minStock ? <Badge variant="default">OK</Badge> : <Badge variant="destructive">Sous le minimum</Badge>}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {article.type === "product" && consignment.enabled && (
        <Card>
          <CardHeader><CardTitle>Calculateur de consignation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm">Quantité :</label>
              <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24 border rounded px-2 py-1" min={1} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b"><th className="text-left py-2">Type</th><th className="text-right py-2">Taille du contenant</th><th className="text-right py-2">Contenants</th><th className="text-right py-2">Consigne/unité</th><th className="text-right py-2">Total</th></tr>
              </thead>
              <tbody>
                {pickPackagingContainers(consignment.packaging, qty).map((c, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{c.packaging_type}</td>
                    <td className="text-right py-2">{c.units_per_article}</td>
                    <td className="text-right py-2">{c.quantity}</td>
                    <td className="text-right py-2">{formatTND(c.deposit_value)}</td>
                    <td className="text-right py-2">{formatTND(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
