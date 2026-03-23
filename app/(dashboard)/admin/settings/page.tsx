'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Save, Building2, Mail, Bell, Shield, Palette } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Settings {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companyLogo: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
  smtpSecure: string
  ticketEmailEnabled: string
  ticketEmailNotify: string
  ticketAutoAssign: string
  defaultTicketPriority: string
  sessionTimeout: string
  maxLoginAttempts: string
  requireStrongPassword: string
  primaryColor: string
  accentColor: string
}

const defaultSettings: Settings = {
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyLogo: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: '',
  smtpSecure: 'true',
  ticketEmailEnabled: 'false',
  ticketEmailNotify: 'true',
  ticketAutoAssign: 'false',
  defaultTicketPriority: 'MEDIUM',
  sessionTimeout: '24',
  maxLoginAttempts: '5',
  requireStrongPassword: 'true',
  primaryColor: '#0066cc',
  accentColor: '#00cc66',
}

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...defaultSettings, ...data })
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Einstellungen gespeichert!' })
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Speichern' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Zugriff verweigert</CardTitle>
            <CardDescription>
              Sie haben keine Berechtigung, diese Seite anzuzeigen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">
            Systemweite Konfiguration verwalten
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Firma
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            E-Mail
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Bell className="mr-2 h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Sicherheit
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Aussehen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Firmendaten</CardTitle>
              <CardDescription>
                Grundlegende Informationen zu Ihrer Firma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Firmenname</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    placeholder="Meine Firma GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Website</Label>
                  <Input
                    id="companyWebsite"
                    value={settings.companyWebsite}
                    onChange={(e) => updateSetting('companyWebsite', e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Adresse</Label>
                <Textarea
                  id="companyAddress"
                  value={settings.companyAddress}
                  onChange={(e) => updateSetting('companyAddress', e.target.value)}
                  placeholder="Musterstrasse 1&#10;12345 Musterstadt"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Telefon</Label>
                  <Input
                    id="companyPhone"
                    value={settings.companyPhone}
                    onChange={(e) => updateSetting('companyPhone', e.target.value)}
                    placeholder="+49 123 456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">E-Mail</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                    placeholder="info@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMTP-Konfiguration</CardTitle>
              <CardDescription>
                E-Mail-Server fuer ausgehende Nachrichten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost}
                    onChange={(e) => updateSetting('smtpHost', e.target.value)}
                    placeholder="mail.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={settings.smtpPort}
                    onChange={(e) => updateSetting('smtpPort', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Benutzername</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser}
                    onChange={(e) => updateSetting('smtpUser', e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Passwort</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpFrom">Absender-Adresse</Label>
                <Input
                  id="smtpFrom"
                  value={settings.smtpFrom}
                  onChange={(e) => updateSetting('smtpFrom', e.target.value)}
                  placeholder="CRM System <noreply@example.com>"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtpSecure"
                  checked={settings.smtpSecure === 'true'}
                  onCheckedChange={(checked) => updateSetting('smtpSecure', String(checked))}
                />
                <Label htmlFor="smtpSecure">TLS/SSL verwenden</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket-Einstellungen</CardTitle>
              <CardDescription>
                Konfiguration des Ticket-Systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>E-Mail-Ticket-Erstellung</Label>
                  <p className="text-sm text-muted-foreground">
                    Tickets automatisch aus eingehenden E-Mails erstellen
                  </p>
                </div>
                <Switch
                  checked={settings.ticketEmailEnabled === 'true'}
                  onCheckedChange={(checked) => updateSetting('ticketEmailEnabled', String(checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Kunden bei Ticket-Updates benachrichtigen
                  </p>
                </div>
                <Switch
                  checked={settings.ticketEmailNotify === 'true'}
                  onCheckedChange={(checked) => updateSetting('ticketEmailNotify', String(checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Zuweisung</Label>
                  <p className="text-sm text-muted-foreground">
                    Neue Tickets automatisch einem Mitarbeiter zuweisen
                  </p>
                </div>
                <Switch
                  checked={settings.ticketAutoAssign === 'true'}
                  onCheckedChange={(checked) => updateSetting('ticketAutoAssign', String(checked))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sicherheitseinstellungen</CardTitle>
              <CardDescription>
                Zugriffs- und Sicherheitskonfiguration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (Stunden)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max. Login-Versuche</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => updateSetting('maxLoginAttempts', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Starkes Passwort erforderlich</Label>
                  <p className="text-sm text-muted-foreground">
                    Mindestens 8 Zeichen, Gross-/Kleinbuchstaben, Zahlen und Sonderzeichen
                  </p>
                </div>
                <Switch
                  checked={settings.requireStrongPassword === 'true'}
                  onCheckedChange={(checked) => updateSetting('requireStrongPassword', String(checked))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erscheinungsbild</CardTitle>
              <CardDescription>
                Anpassung des visuellen Erscheinungsbilds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primaerfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Akzentfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
