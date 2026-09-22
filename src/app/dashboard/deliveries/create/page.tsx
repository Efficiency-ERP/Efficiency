"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useOrganizationSelection } from "@/contexts/organization-context"
import { useContactsStore } from "@/contexts/contacts-store"
import { useArticlesStore } from "@/contexts/articles-store"
import { useMyOrganization } from "@/hooks/use-my-organization"
import { useActionLog } from "@/hooks/use-action-log"
import { createDelivery, getNextDocumentNumber, getQuote, getQuoteLines } from "@/lib/supabase/invoices"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrganizationBadge, organizationItemClassName, sortMyOrganizationsFirst } from "@/components/organization-option"

export default function CreateDeliveryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedOrgId } = useOrganizationSelection()
  const { contacts, organizations } = useContactsStore()
  const { articles, updateArticle: updateArticleInStore } = useArticlesStore()
  const { isContactMyOrganization, isArticleMyOrganization } = useMyOrganization()
  const logAction = useActionLog("deliveries")
  const sourceQuoteId = searchParams.get("sourceQuoteId")
  const [organizationId, setOrganizationId] = useState(selectedOrgId !== "all" ? selectedOrgId : "")
  const [counterpartyId, setCounterpartyId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<Array<{ article_id: string | null; code: string; designation: string; unit: string | null; quantity: number }>>([])
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(Boolean(sourceQuoteId))
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)

  useEffect(() => {
    async function prefillFromQuote() {
      try {
        const quote = await getQuote(sourceQuoteId!)
        if (!quote) return
        const quoteLines = await getQuoteLines(sourceQuoteId!)
        setOrganizationId(quote.organization_id)
        setCounterpartyId(quote.counterparty_id)
        setLines(quoteLines.map((l) => ({
          article_id: l.article_id,
          code: l.code,
          designation: l.designation,
          unit: l.unit,
          quantity: l.quantity,
        })))
        setSourceLabel(`quote ${quote.number}`)
      } catch (err) {
        console.error(err)
        alert("Échec du chargement du devis")
      } finally {
        setPrefilling(false)
      }
    }
    if (sourceQuoteId) prefillFromQuote()
  }, [sourceQuoteId])

  const addFromArticle = (articleId: string) => {
    const article = articles.find((a) => a.id === articleId)
    if (!article) return
    setLines([...lines, { article_id: article.id, code: article.code, designation: article.designation, unit: article.unit, quantity: 1 }])
  }

  const addFreeformLine = () => setLines([...lines, { article_id: null, code: "", designation: "", unit: null, quantity: 1 }])
  const updateLine = (i: number, patch: Partial<typeof lines[0]>) => { const u = [...lines]; u[i] = { ...u[i], ...patch }; setLines(u) }
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) { alert("Sélectionner une organisation"); return }
    if (!counterpartyId) { alert("Sélectionner un tiers"); return }
    if (lines.length === 0) { alert("Ajoutez au moins une ligne"); return }
    setLoading(true)
    try {
      const { delivery, updatedArticles } = await createDelivery({ number: await getNextDocumentNumber(organizationId, "D"), date, organization_id: organizationId, counterparty_id: counterpartyId, driver_name: null, vehicle_registration: null, status: "draft", source_quote_id: sourceQuoteId || null }, lines)
      for (const article of updatedArticles) updateArticleInStore(article.id, article)
      await logAction(`Created delivery ${delivery.number}`, delivery.id, organizationId)
      router.push("/dashboard/deliveries")
    } catch { alert("Échec de la création du bon de livraison") } finally { setLoading(false) }
  }

  const filteredContacts = sortMyOrganizationsFirst(contacts.filter((c) => c.party_type !== "supplier"), isContactMyOrganization)
  const sortedArticles = sortMyOrganizationsFirst(articles, isArticleMyOrganization)
  const pageTitle = sourceLabel ? `Confirm Delivery — from ${sourceLabel}` : "Create Delivery (BL)"

  if (prefilling) return <div className="text-muted-foreground">Chargement du document source...</div>

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{pageTitle}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>En-tête</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Organisation *</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une organisation" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tiers *</Label>
                <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un contact" /></SelectTrigger>
                  <SelectContent>
                    {filteredContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className={organizationItemClassName(isContactMyOrganization(c))}>
                        {c.company_name}
                        {isContactMyOrganization(c) && <OrganizationBadge />}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Numéro</Label><Input value="Auto-generated on save" readOnly /></div>
              <div className="grid gap-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lignes</CardTitle>
            <div className="flex gap-2">
              <Select onValueChange={addFromArticle}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ajouter depuis un article" /></SelectTrigger>
                <SelectContent>
                  {sortedArticles.map((a) => (
                    <SelectItem key={a.id} value={a.id} className={organizationItemClassName(isArticleMyOrganization(a))}>
                      {a.code} — {a.designation}
                      {isArticleMyOrganization(a) && <OrganizationBadge />}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addFreeformLine}>Libre</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucune ligne</div> : (
              <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">Code</th><th className="text-left p-2">Désignation</th><th className="text-right p-2">Qté</th><th className="text-left p-2">Unité</th><th></th></tr></thead>
                <tbody>{lines.map((line, i) => (<tr key={i} className="border-b"><td className="p-1"><Input value={line.code} onChange={(e) => updateLine(i, { code: e.target.value })} className="h-8" /></td><td className="p-1"><Input value={line.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} className="h-8" /></td><td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-8 w-20 text-right" /></td><td className="p-1"><Input value={line.unit || ""} onChange={(e) => updateLine(i, { unit: e.target.value || null })} className="h-8 w-20" /></td><td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>X</Button></td></tr>))}</tbody></table>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-4"><Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer le bon de livraison"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button></div>
      </form>
    </div>
  )
}
