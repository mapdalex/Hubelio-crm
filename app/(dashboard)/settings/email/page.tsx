'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { ArrowLeft, Plus, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'

type EmailSettings = {
  id: string
  name: string
  protocol: string
  host: string
  port: number
  username: string
  isActive: boolean
}

export default function EmailSettingsPage() {
  const { companyId } = useAuth()
  const [emailAccounts, setEmailAccounts] = useState<EmailSettings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
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
  })

  useEffect(() => {
    loadEmailSettings()
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }))
  }

  const handleAddEmailAccount = async () => {
    if (!companyId) return

    try {
      const res = await fetch(`/api/companies/${companyId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({
          name: '',
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
        })
        loadEmailSettings()
      }
    } catch (error) {
      console.error('Error adding email account:', error)
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
                  <div>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>{account.username}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
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
                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-muted-foreground">Benutzername</p>
                    <p className="font-medium">{account.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>E-Mail-Konto hinzufügen</DialogTitle>
            <DialogDescription>
              Konfigurieren Sie ein neues E-Mail-Konto für die Synchronisierung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Kontoname</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="z.B. Support"
              />
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddEmailAccount}>
              Konto hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
