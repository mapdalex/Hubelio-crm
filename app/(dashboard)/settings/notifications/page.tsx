'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

export default function NotificationsPage() {
  const { user } = useAuth()

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benachrichtigungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Benachrichtigungseinstellungen</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* E-Mail-Benachrichtigungen */}
        <Card>
          <CardHeader>
            <CardTitle>E-Mail-Benachrichtigungen</CardTitle>
            <CardDescription>Erhalten Sie Benachrichtigungen per E-Mail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="tickets-email">Neue Tickets</Label>
                <p className="text-sm text-muted-foreground">Benachrichtigung, wenn neue Tickets erstellt werden</p>
              </div>
              <Switch id="tickets-email" defaultChecked />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="tickets-assigned">Zugewiesene Tickets</Label>
                <p className="text-sm text-muted-foreground">Benachrichtigung, wenn mir Tickets zugewiesen werden</p>
              </div>
              <Switch id="tickets-assigned" defaultChecked />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="comments-email">Neue Kommentare</Label>
                <p className="text-sm text-muted-foreground">Benachrichtigung, wenn neue Kommentare zu meinen Tickets hinzugefügt werden</p>
              </div>
              <Switch id="comments-email" defaultChecked />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="mentions-email">Erwähnungen</Label>
                <p className="text-sm text-muted-foreground">Benachrichtigung, wenn ich erwähnt werde</p>
              </div>
              <Switch id="mentions-email" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System-Benachrichtigungen */}
        <Card>
          <CardHeader>
            <CardTitle>System-Benachrichtigungen</CardTitle>
            <CardDescription>In-App-Benachrichtigungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-email">Sicherheitswarnungen</Label>
                <p className="text-sm text-muted-foreground">Benachrichtigungen für wichtige Sicherheitsereignisse</p>
              </div>
              <Switch id="system-email" defaultChecked />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="marketing">Marketing und Updates</Label>
                <p className="text-sm text-muted-foreground">Informationen über neue Features und Updates</p>
              </div>
              <Switch id="marketing" />
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label htmlFor="digest">Wöchentliche Zusammenfassung</Label>
                <p className="text-sm text-muted-foreground">Zusammenfassung der wichtigsten Aktivitäten</p>
              </div>
              <Switch id="digest" />
            </div>
          </CardContent>
        </Card>

        {/* Ruhemodus */}
        <Card>
          <CardHeader>
            <CardTitle>Ruhemodus</CardTitle>
            <CardDescription>Deaktivieren Sie vorübergehend alle Benachrichtigungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet-mode">Ruhemodus aktivieren</Label>
                <p className="text-sm text-muted-foreground">Keine Benachrichtigungen bis 08:00 Uhr morgen</p>
              </div>
              <Switch id="quiet-mode" />
            </div>
          </CardContent>
        </Card>

        {/* Speichern */}
        <div className="flex gap-4">
          <Button>Speichern</Button>
          <Button variant="outline">Zurücksetzen</Button>
        </div>
      </div>
    </main>
  )
}
