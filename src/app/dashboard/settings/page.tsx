"use client"

import { useState } from "react"
import { useUser } from "@/contexts/user-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const { user, organizations, updateUser, loading } = useUser()
  const [userName, setUserName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (loading) return <div className="text-muted-foreground">Loading settings...</div>

  const handleSaveProfile = async () => {
    setSaving(true)
    await updateUser({ name: userName })
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
