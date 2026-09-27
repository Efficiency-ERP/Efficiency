"use client"

import { useState } from "react"
import Link from "next/link"
import { useUser } from "@/contexts/user-context"
import { useActionLog } from "@/hooks/use-action-log"
import { useNavigation } from "@/contexts/navigation-context"
import { useSidebarPrefs } from "@/contexts/sidebar-prefs-context"
import { applySidebarOrder } from "@/hooks/use-sidebar-prefs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronUp, ChevronDown } from "lucide-react"

export default function SettingsPage() {
  const { user, organizations, updateUser, loading } = useUser()
  const logAction = useActionLog("settings")
  const { navigationItems } = useNavigation()
  const { prefs, loaded: sidebarPrefsLoaded, toggleHidden, move, reset: resetSidebarPrefs } = useSidebarPrefs()
  const [userName, setUserName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // "Dashboard" is always pinned first and isn't reorderable/hideable.
  const [, ...reorderableItems] = navigationItems
  const effectiveOrder = applySidebarOrder(reorderableItems, prefs.order)
  const effectiveUrls = effectiveOrder.map((i) => i.url)

  if (loading) return <div className="text-muted-foreground">Chargement des paramètres...</div>

  const handleSaveProfile = async () => {
    setSaving(true)
    await updateUser({ name: userName })
    await logAction(`Updated profile name to "${userName}"`, user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      {saved && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Enregistré avec succès</div>}
      <Card>
        <CardHeader><CardTitle>Paramètres du profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Nom</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Email</Label><Input value={user.email} readOnly disabled /></div>
          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
            <Button variant="outline" onClick={() => setUserName(user.name)}>Réinitialiser</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Barre latérale</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Réorganisez ou masquez les pages de votre barre latérale. Enregistré sur cet appareil uniquement.</p>
          {!sidebarPrefsLoaded ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {effectiveOrder.map((item, i) => {
                const isHidden = prefs.hidden.includes(item.url)
                return (
                  <div key={item.url} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                      <span className={isHidden ? "text-muted-foreground line-through" : ""}>{item.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(effectiveUrls, item.url, -1)}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" disabled={i === effectiveOrder.length - 1} onClick={() => move(effectiveUrls, item.url, 1)}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleHidden(item.url)}>
                        {isHidden ? "Afficher" : "Masquer"}
                      </Button>
                    </div>
                  </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" onClick={resetSidebarPrefs}>Réinitialiser par défaut</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Mes organisations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Identité imprimée sur vos documents : logo, matricule fiscal, adresse et coordonnées bancaires.
          </p>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune organisation attribuée. Contactez un administrateur.</p>
          ) : (
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{org.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{org.id.slice(0, 8)}...</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/organizations/${org.id}/edit`}>Modifier</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
