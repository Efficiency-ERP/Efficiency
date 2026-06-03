"use client"

import { use } from "react"
import { useContactsStore } from "@/contexts/contacts-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { castJson } from "@/lib/utils"
import type { Address, ContactInfo } from "@/types/database"

export default function ContactSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { contacts, loading } = useContactsStore()

  const contact = contacts.find((c) => c.id === id)

  if (loading) return <div className="text-muted-foreground">Loading...</div>
  if (!contact) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-bold">Contact introuvable</h2>
      <Button variant="outline" onClick={() => router.push("/dashboard/contacts")}>Back to contacts</Button>
    </div>
  )

  const address = castJson<Address>(contact.address)
  const contactInfo = castJson<ContactInfo>(contact.contact)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contact.company_name}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant={contact.party_type === "customer" ? "default" : contact.party_type === "supplier" ? "secondary" : "outline"}>
              {contact.party_type}
            </Badge>
            {contact.is_internal_org && <Badge variant="secondary">Interne</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/contacts/${id}/edit`)}>Edit Contact</Button>
          {contact.party_type !== "supplier" && (
            <Button onClick={() => router.push(`/dashboard/invoices/create/standard?selectedContact=${id}`)}>Create Invoice</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contact.mf && <div><span className="text-muted-foreground">MF:</span> {contact.mf}</div>}
            {contact.unique_id && <div><span className="text-muted-foreground">ID:</span> {contact.unique_id}</div>}
            {contactInfo.phone && <div><span className="text-muted-foreground">Phone:</span> {contactInfo.phone}</div>}
            {contactInfo.fax && <div><span className="text-muted-foreground">Fax:</span> {contactInfo.fax}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {address.line1 && <div>{address.line1}</div>}
            <div>{address.city} {address.zipCode}</div>
            <div>{address.country}</div>
            {contact.conditions_de_vente && (
              <div className="mt-2"><span className="text-muted-foreground">Conditions:</span> {contact.conditions_de_vente}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
