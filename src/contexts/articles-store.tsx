"use client"

import React, { createContext, useContext, useMemo, useState, useEffect } from "react"
import type { Article } from "@/types/database"
import { getArticles } from "@/lib/supabase/articles"

interface ArticlesStore {
  articles: Article[]
  loading: boolean
  addArticle: (a: Article) => void
  updateArticle: (id: string, patch: Partial<Article>) => void
  toggleActive: (id: string) => void
}

const ArticlesContext = createContext<ArticlesStore | undefined>(undefined)

export function ArticlesProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getArticles()
        setArticles(data)
      } catch (err) {
        console.error("Failed to load articles:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const store = useMemo<ArticlesStore>(() => ({
    articles,
    loading,
    addArticle: (a: Article) => setArticles((prev) => [a, ...prev]),
    updateArticle: (id: string, patch: Partial<Article>) =>
      setArticles((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    toggleActive: (id: string) =>
      setArticles((prev) => prev.map((x) => (x.id === id ? { ...x, active: !x.active } : x))),
  }), [articles, loading])

  return <ArticlesContext.Provider value={store}>{children}</ArticlesContext.Provider>
}

export function useArticlesStore() {
  const ctx = useContext(ArticlesContext)
  if (!ctx) throw new Error("useArticlesStore must be used within ArticlesProvider")
  return ctx
}
