'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus, Loader2, Trash2, Eye, EyeOff, Mail, Ticket, Settings2, RefreshCw } from 'lucide-react'

type EmailSettings = {
  id: string
  name: string
  displayName: string | null
  protocol: string
  host: string
  port: number
  username: string
  isActive: boolean
  accountType: 'STANDARD' | 'TICKET_SYSTEM'
  createTicketOnReceive: boolean
  lastSync: string | null
}

type User = {
  id: string
  name: string
  email: string
}

export default function EmailSettingsPage() {
  const { companyId } = useAuth()
  const [emailAccounts, setEmailAccounts] = useState<EmailSettings[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    protocol: 'IMAP',
    host: '',
    port: 993,
    username: '',
    password: '',
    useSsl: true,
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpUseSsl: true,
    accountType: 'STANDARD' as 'STANDARD' | 'TICKET_SYSTEM',
    createTicketOnReceive: false,
    autoAssignToUserId: '',
  })

  useEffect(() => {
    loadEmailSettings()
    loadUsers()
  }, [companyId])

  const loadEmailSettings = async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/email`)
      if (res.ok) {
        const data = await res.json()
        setEmailAccounts(data.settings)
      }
    } catch (error) {
      console.error('Error loading email settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      protocol: 'IMAP',
      host: '',
      port: 993,
      username: '',
      password: '',
      useSsl: true,
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpUseSsl: true,
      accountType: 'STANDARD',
      createTicketOnReceive: false,
      autoAssignToUserId: '',
    })
    setEditingId(null)
    setTestResult(null)
  }

  const handleAddEmailAccount = async () => {
    if (!companyId) return

    try {
      const url = editingId 
        ? `/api/companies/${companyId}/email/${editingId}`
        : `/api/companies/${companyId}/email`
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(editingId ? 'Konto aktualisiert' : 'Konto hinzugefuegt')
        setIsDialogOpen(false)
        resetForm()
        loadEmailSettings()
      } else {
        toast.error(data.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('[v0] Error saving email account:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const handleEditAccount = (account: EmailSettings) => {
    setEditingId(account.id)
    setFormData({
      name: account.name,
      displayName: account.displayName || '',
      protocol: account.protocol,
      host: account.host,
      port: account.port,
      username: account.username,
      password: '', // Don't pre-fill password for security
      useSsl: true,
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpUseSsl: true,
      accountType: account.accountType,
      createTicketOnReceive: account.createTicketOnReceive,
      autoAssignToUserId: '',
    })
    setIsDialogOpen(true)
  }

  const handleTestConnection = async () => {
    if (!companyId) return
    
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const res = await fetch(`/api/companies/${companyId}/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: formData.protocol,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          useSsl: formData.useSsl,
        }),
      })
      
      const data = await res.json()
      setTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Verbindung erfolgreich!' : 'Verbindung fehlgeschlagen'),
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Verbindungstest fehlgeschlagen',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeleteEmailAccount = async (id: string) => {
    if (!companyId || !confirm('E-Mail-Konto wirklich löschen?')) return

    try {
      const res = await fetch(`/api/companies/${companyId}/email/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        loadEmailSettings()
      }
    } catch (error) {
      console.error('Error deleting email account:', error)
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">E-Mail-Konfiguration</h1>
            <p className="text-muted-foreground">Verbundene E-Mail-Konten verwalten</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          E-Mail hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : emailAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Keine E-Mail-Konten konfiguriert</p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Erstes Konto hinzufügen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {emailAccounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      account.accountType === 'TICKET_SYSTEM' 
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' 
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {account.accountType === 'TICKET_SYSTEM' ? (
                        <Ticket className="h-5 w-5" />
                      ) : (
                        <Mail className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {account.displayName || account.name}
                      </CardTitle>
                      <CardDescription>{account.username}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.accountType === 'TICKET_SYSTEM' ? 'default' : 'outline'}>
                      {account.accountType === 'TICKET_SYSTEM' ? 'Ticket-System' : 'Standard'}
                    </Badge>
                    {account.createTicketOnReceive && (
                      <Badge variant="secondary">Auto-Ticket</Badge>
                    )}
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAccount(account)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEmailAccount(account.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted-foreground">Protokoll</p>
                    <p className="font-medium">{account.protocol}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Host</p>
                    <p className="font-medium">{account.host}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Port</p>
                    <p className="font-medium">{account.port}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Letzte Synchronisation</p>
                    <p className="font-medium">
                      {account.lastSync 
                        ? new Date(account.lastSync).toLocaleString('de-DE') 
                        : 'Nie'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'E-Mail-Konto bearbeiten' : 'E-Mail-Konto hinzufuegen'}
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie ein E-Mail-Konto fuer die Synchronisierung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kontotyp Auswahl */}
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Kontotyp</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountType: 'STANDARD', createTicketOnReceive: false }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    formData.accountType === 'STANDARD'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <Mail className={`h-8 w-8 ${formData.accountType === 'STANDARD' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Normales Postfach</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Standard E-Mail-Konto ohne Ticket-Integration
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountType: 'TICKET_SYSTEM' }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    formData.accountType === 'TICKET_SYSTEM'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <Ticket className={`h-8 w-8 ${formData.accountType === 'TICKET_SYSTEM' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">Ticket-System</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Eingehende Mails koennen Tickets erstellen
                  </span>
                </button>
              </div>
              
              {/* Ticket-System Optionen */}
              {formData.accountType === 'TICKET_SYSTEM' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="createTicketOnReceive" className="font-medium">
                        Automatisch Tickets erstellen
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Neue E-Mails werden automatisch als Tickets angelegt
                      </p>
                    </div>
                    <Switch
                      id="createTicketOnReceive"
                      checked={formData.createTicketOnReceive}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, createTicketOnReceive: checked }))
                      }
                    />
                  </div>
                  
                  {formData.createTicketOnReceive && (
                    <div className="grid gap-2">
                      <Label htmlFor="autoAssignToUserId">Auto-Zuweisung (optional)</Label>
                      <Select 
                        value={formData.autoAssignToUserId} 
                        onValueChange={(value) =>
                          setFormData(prev => ({ ...prev, autoAssignToUserId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mitarbeiter auswaehlen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keine automatische Zuweisung</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Neue Tickets werden automatisch diesem Mitarbeiter zugewiesen
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Interner Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="z.B. Support"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayName">Anzeigename (Sidebar)</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="z.B. Support Postfach"
                />
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4">
              <h3 className="font-semibold">Eingangsserver (IMAP/POP3)</h3>

              <div className="grid gap-2">
                <Label htmlFor="protocol">Protokoll</Label>
                <Select value={formData.protocol} onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, protocol: value }))
                }>
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMAP">IMAP</SelectItem>
                    <SelectItem value="POP3">POP3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    name="host"
                    value={formData.host}
                    onChange={handleInputChange}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    name="port"
                    type="number"
                    value={formData.port}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="E-Mail-Adresse"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4">
              <h3 className="font-semibold">Ausgangsserver (SMTP)</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="smtpHost">Host</Label>
                  <Input
                    id="smtpHost"
                    name="smtpHost"
                    value={formData.smtpHost}
                    onChange={handleInputChange}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input
                    id="smtpPort"
                    name="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtpUsername">Benutzername (optional)</Label>
                <Input
                  id="smtpUsername"
                  name="smtpUsername"
                  value={formData.smtpUsername}
                  onChange={handleInputChange}
                  placeholder="Falls unterschiedlich"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtpPassword">Passwort (optional)</Label>
                <Input
                  id="smtpPassword"
                  name="smtpPassword"
                  type="password"
                  value={formData.smtpPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Verbindungstest Ergebnis */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.success 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t mt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isTesting || !formData.host || !formData.username}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Teste...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verbindung testen
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleAddEmailAccount}>
              {editingId ? 'Speichern' : 'Konto hinzufuegen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
