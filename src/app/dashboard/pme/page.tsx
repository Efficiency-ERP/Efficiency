"use client"

import { useContactsStore } from "@/contexts/contacts-store"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function PMEPage() {
  const { organizations } = useContactsStore()
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PME (Organizations)</h1>
        <Button onClick={() => router.push("/dashboard/pme/add")}>Add PME</Button>
      </div>
      <div className="grid gap-4">
        {organizations.map((org) => (
          <div key={org.id} className="border rounded-lg p-4">
            <div className="font-semibold">{org.name}</div>
            <div className="text-sm text-muted-foreground">ID: {org.id}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
