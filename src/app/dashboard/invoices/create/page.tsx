"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, CreditCard, ArrowDownRight, Truck, Package, LogOut } from "lucide-react"

export default function CreateInvoiceChooserPage() {
  const router = useRouter()

  const options = [
    { label: "Standard Invoice", type: "standard", icon: FileText, variant: "default" as const },
    { label: "Credit / Avoir", type: "credit", icon: CreditCard, variant: "destructive" as const },
    { label: "Debit / Doit", type: "debit", icon: ArrowDownRight, variant: "secondary" as const },
    { label: "Supplier Order", type: "supplier-order", icon: Package, variant: "outline" as const },
    { label: "Customer Delivery", type: "delivery", icon: Truck, variant: "outline" as const },
    { label: "Warehouse Issue", type: "issue", icon: LogOut, variant: "outline" as const },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Document</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon
          return (
            <Card key={opt.type} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex flex-col items-center gap-3 p-6">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <Button variant={opt.variant} onClick={() => {
                  if (opt.type === "supplier-order") router.push("/dashboard/orders/create?type=supplier")
                  else if (opt.type === "delivery") router.push("/dashboard/deliveries/create")
                  else if (opt.type === "issue") router.push("/dashboard/issues/create")
                  else router.push(`/dashboard/invoices/create/${opt.type}`)
                }}>
                  {opt.label}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
