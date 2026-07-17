"use client"

import { useState } from "react"
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

  if (loading) return <div className="text-muted-foreground">Loading settings...</div>

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
      <h1 className="text-2xl font-bold">Settings</h1>
      {saved && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Saved successfully</div>}
      <Card>
        <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2"><Label>Name</Label><Input value={userName} onChange={(e) => setUserName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Email</Label><Input value={user.email} readOnly disabled /></div>
          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            <Button variant="outline" onClick={() => setUserName(user.name)}>Reset</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sidebar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Reorder or hide pages in your sidebar. Saved on this device only.</p>
          {!sidebarPrefsLoaded ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
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
                        {isHidden ? "Show" : "Hide"}
                      </Button>
                    </div>
                  </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" onClick={resetSidebarPrefs}>Reset to default</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>My Organizations</CardTitle></CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations assigned. Contact an admin.</p>
          ) : (
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id} className="flex items-center justify-between text-sm">
                  <span>{org.name}</span>
                  <Badge variant="secondary">{org.id.slice(0, 8)}...</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
