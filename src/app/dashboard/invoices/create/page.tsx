"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// /dashboard/invoices/create used to be a picker mixing standard/credit/debit
// invoices with supplier orders, deliveries, and quotes — five unrelated
// flows behind one "invoices" URL. Orders/quotes/deliveries now have their
// own entry point from their own section, and credit/debit notes are only
// ever started from the invoice they correct (its detail page); this route
// is just the direct standard-invoice form, reached with no picker in between.
export default function CreateInvoiceRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(`/dashboard/invoices/create/standard${qs ? `?${qs}` : ""}`)
  }, [router, searchParams])

  return <div className="text-muted-foreground">Redirecting...</div>
}
