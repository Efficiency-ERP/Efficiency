"use client"

import React, { createContext, useContext, useMemo, useState, useEffect } from "react"
import type { Contact, Organization } from "@/types/database"
import { getContacts, getOrganizations } from "@/lib/supabase/contacts"

interface ContactsStore {
  contacts: Contact[]
  organizations: Organization[]
  loading: boolean
  error: string | null
  addContact: (c: Contact) => void
  updateContact: (id: string, patch: Partial<Contact>) => void
  archiveContact: (id: string) => void
  addOrganization: (o: Organization) => void
  updateOrganization: (id: string, patch: Partial<Organization>) => void
}

const ContactsContext = createContext<ContactsStore | undefined>(undefined)

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [orgsData, contactsData] = await Promise.all([
          getOrganizations(),
          getContacts(),
        ])
        setOrganizations(orgsData)
        setContacts(contactsData)
      } catch (err) {
        console.error("Failed to load contacts data:", err)
        setError("Failed to load contacts")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const store = useMemo<ContactsStore>(() => ({
    contacts,
    organizations,
    loading,
    error,
    addContact: (c: Contact) => setContacts((prev) => [c, ...prev]),
    updateContact: (id: string, patch: Partial<Contact>) =>
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    archiveContact: (id: string) =>
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, archived: true } : c))),
    addOrganization: (o: Organization) => setOrganizations((prev) => [o, ...prev]),
    updateOrganization: (id: string, patch: Partial<Organization>) =>
      setOrganizations((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o))),
  }), [contacts, organizations, loading, error])

  return <ContactsContext.Provider value={store}>{children}</ContactsContext.Provider>
}

export function useContactsStore() {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error("useContactsStore must be used within ContactsProvider")
  return ctx
}
