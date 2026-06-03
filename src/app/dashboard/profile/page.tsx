"use client"

import { useUser } from "@/contexts/user-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function ProfilePage() {
  const { user, organizations, loading } = useUser()

  if (loading) return <div className="text-muted-foreground">Loading profile...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>User</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <Badge className="mt-1">{user.role}</Badge>
          </div>
        </CardContent>
      </Card>
      {organizations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between">
                <span>{org.name}</span>
                <Badge variant="secondary">{org.id.slice(0, 8)}...</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
