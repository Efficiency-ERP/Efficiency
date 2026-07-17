import { createClient } from "@/lib/supabase/client"
import type { Article, DeliveryLine, Stock, StockMovement } from "@/types/database"

export async function getStockMovements(organizationId?: string): Promise<StockMovement[]> {
  const supabase = createClient()
  let query = supabase
    .from("stock_movements")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function recordDeliveryStockMovements(
  organizationId: string,
  deliveryId: string,
  date: string,
  lines: Pick<DeliveryLine, "article_id" | "quantity">[]
): Promise<Article[]> {
  const supabase = createClient()

  const quantityByArticle = new Map<string, number>()
  for (const line of lines) {
    if (!line.article_id) continue
    quantityByArticle.set(line.article_id, (quantityByArticle.get(line.article_id) || 0) + line.quantity)
  }

  if (quantityByArticle.size === 0) return []

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("*")
    .in("id", [...quantityByArticle.keys()])

  if (articlesError) throw articlesError

  const updatedArticles: Article[] = []
  for (const article of articles || []) {
    const qty = quantityByArticle.get(article.id) || 0
    if (qty === 0) continue

    const stock = article.stock as unknown as Stock
    const newStock: Stock = { onHand: stock.onHand - qty, minStock: stock.minStock }

    const { data: updated, error: updateError } = await supabase
      .from("articles")
      .update({ stock: newStock })
      .eq("id", article.id)
      .select()
      .single()

    if (updateError) throw updateError
    updatedArticles.push(updated)
  }

  const { error: movementsError } = await supabase
    .from("stock_movements")
    .insert(
      [...quantityByArticle.entries()].map(([articleId, qty]) => ({
        article_id: articleId,
        organization_id: organizationId,
        quantity_delta: -qty,
        direction: "out" as const,
        source_type: "delivery" as const,
        source_id: deliveryId,
        date,
      }))
    )

  if (movementsError) throw movementsError

  return updatedArticles
}
