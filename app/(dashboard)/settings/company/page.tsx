'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useAuth } from '@/lib/auth-context'
import { Save, Building2, Users, Settings, UserPlus, Loader2 } from 'lucide-react'

type CompanyUser = {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    lastLogin: string | null
  }
}

const roleLabels: Record<string, string> = {
  OWNER: 'Eigentuemer',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  MEMBER: 'Mitglied',
  VIEWER: 'Betrachter',
}

export default function CompanySettingsPage() {
  const { currentCompany, companyRole, canManageCompany } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('MEMBER')
  const [isAddingUser, setIsAddingUser] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
  })

  useEffect(() => {
    if (currentCompany?.id) {
      loadCompanyData()
      loadCompanyUsers()
    }
  }, [currentCompany?.id])

  const loadCompanyData = async () => {
    try {
      const res = await fetch(`/api/companies/${currentCompany?.id}`)
      if (res.ok) {
        const data = await res.json()
        setFormData({
          name: data.company.name || '',
          email: data.company.email || '',
          phone: data.company.phone || '',
          address: data.company.address || '',
          website: data.company.website || '',
          timezone: data.company.timezone || 'Europe/Berlin',
          currency: data.company.currency || 'EUR',
        })
      }
    } catch (error) {
      console.error('Error loading company:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompanyUsers = async () => {
    try {
      const res = await fetch(`/api/companies/${currentCompany?.id}/users`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSave = async () => {
    if (!canManageCompany()) return

    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/companies/${currentCompany?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Einstellungen gespeichert!' })
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Speichern' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return

    setIsAddingUser(true)
    try {
      const res = await fetch(`/api/companies/${currentCompany?.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          role: newUserRole,
        }),
      })

      if (res.ok) {
        setIsAddUserDialogOpen(false)
        setNewUserEmail('')
        setNewUserRole('MEMBER')
        await loadCompanyUsers()
        setMessage({ type: 'success', text: 'Benutzer hinzugefuegt!' })
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Hinzufuegen' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Hinzufuegen' })
    } finally {
      setIsAddingUser(false)
    }
  }

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Keine Firma ausgewaehlt</CardTitle>
            <CardDescription>
              Bitte waehlen Sie zuerst eine Firma aus.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firmeneinstellungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie die Einstellungen fuer {currentCompany.name}
          </p>
        </div>
        {canManageCompany() && (
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" />
            Allgemein
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Benutzer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
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
                  <Label htmlFor="name">Firmenname</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!canManageCompany()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="https://www.example.com"
                    disabled={!canManageCompany()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  disabled={!canManageCompany()}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={!canManageCompany()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={!canManageCompany()}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zeitzone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timezone: value })
                    }
                    disabled={!canManageCompany()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                      <SelectItem value="Europe/Vienna">Europe/Vienna</SelectItem>
                      <SelectItem value="Europe/Zurich">Europe/Zurich</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Waehrung</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={!canManageCompany()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="CHF">CHF - Schweizer Franken</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ihre Rolle</CardTitle>
              <CardDescription>
                Ihre aktuelle Rolle in dieser Firma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-base">
                {roleLabels[companyRole || ''] || companyRole}
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Firmenbenutzer</CardTitle>
                  <CardDescription>
                    Benutzer, die Zugriff auf diese Firma haben
                  </CardDescription>
                </div>
                {canManageCompany() && (
                  <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Benutzer hinzufuegen
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Beigetreten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((cu) => (
                    <TableRow key={cu.id}>
                      <TableCell className="font-medium">
                        {cu.user.name}
                      </TableCell>
                      <TableCell>{cu.user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[cu.role] || cu.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cu.user.isActive ? 'default' : 'secondary'}
                        >
                          {cu.user.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(cu.joinedAt).toLocaleDateString('de-DE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer hinzufuegen</DialogTitle>
            <DialogDescription>
              Fuegen Sie einen bestehenden Benutzer zu dieser Firma hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">E-Mail Adresse</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="benutzer@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rolle</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="MEMBER">Mitglied</SelectItem>
                  <SelectItem value="VIEWER">Betrachter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddUserDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isAddingUser || !newUserEmail.trim()}
            >
              {isAddingUser ? 'Fuegt hinzu...' : 'Hinzufuegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
