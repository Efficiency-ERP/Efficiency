import { createClient } from "@/lib/supabase/client"
import type { Article } from "@/types/database"

export async function getArticles(organizationId?: string): Promise<Article[]> {
  const supabase = createClient()
  let query = supabase
    .from("articles")
    .select("*")
    .order("code")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getArticle(id: string): Promise<Article | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function createArticle(article: Omit<Article, "id" | "created_at">): Promise<Article> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .insert(article)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateArticle(id: string, patch: Partial<Article>): Promise<Article> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleArticleActive(id: string): Promise<Article> {
  const supabase = createClient()

  const { data: article, error: fetchError } = await supabase
    .from("articles")
    .select("active")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from("articles")
    .update({ active: !article.active })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}
