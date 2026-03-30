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
import { useRouter } from 'next/navigation'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Save, Building2, Users, Settings, UserPlus, Loader2, Trash2, AlertTriangle, Crown, Package } from 'lucide-react'

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

type ModuleSubscription = {
  moduleId: string
  tier: string
  module: {
    name: string
    description: string
    icon: string
    basePrice: number
    status: string
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
  const { currentCompany, companyRole, canManageCompany, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [modules, setModules] = useState<ModuleSubscription[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('MEMBER')
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  const isOwner = companyRole === 'OWNER'
  const ownerCount = users.filter(u => u.role === 'OWNER').length

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
      const [companyRes, usersRes, modulesRes] = await Promise.all([
        fetch(`/api/companies/${currentCompany?.id}`),
        fetch(`/api/companies/${currentCompany?.id}/users`),
        fetch(`/api/companies/${currentCompany?.id}/subscriptions`),
      ])

      if (companyRes.ok) {
        const data = await companyRes.json()
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

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }

      if (modulesRes.ok) {
        const data = await modulesRes.json()
        setModules(data)
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
  
  const handleDeleteCompany = async () => {
    if (!currentCompany || deleteConfirmation !== currentCompany.name) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/companies/${currentCompany.id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        // Nach dem Loeschen ausloggen und zur Login-Seite weiterleiten
        await logout()
        router.push('/login')
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Fehler beim Loeschen' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Loeschen der Firma' })
    } finally {
      setIsDeleting(false)
      setDeleteConfirmation('')
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
          <TabsTrigger value="modules">
            <Package className="mr-2 h-4 w-4" />
            Module
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="danger">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Gefahrenzone
            </TabsTrigger>
          )}
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
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {companyRole === 'OWNER' && <Crown className="h-4 w-4 text-amber-500" />}
                <Badge variant="secondary" className="text-base">
                  {roleLabels[companyRole || ''] || companyRole}
                </Badge>
              </div>
              {companyRole === 'OWNER' && (
                <p className="text-sm text-muted-foreground">
                  Als Eigentuemer koennen Sie diese Firma loeschen. 
                  Es gibt derzeit {ownerCount} Eigentuemer (max. 2 erlaubt).
                </p>
              )}
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
                        <Badge 
                          variant="outline"
                          className={cu.role === 'OWNER' 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' 
                            : ''
                          }
                        >
                          {cu.role === 'OWNER' && <Crown className="mr-1 h-3 w-3" />}
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
        
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ihre gebuchten Module
              </CardTitle>
              <CardDescription>
                Uebersicht der Module, die fuer Ihre Firma verfuegbar sind
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Noch keine Module fuer Ihre Firma aktiviert</p>
                  <p className="text-sm">Kontaktieren Sie den Admin, um Module zu aktivieren</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {modules.map((subscription) => (
                    <Card key={subscription.moduleId} className="p-4 border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{subscription.module.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {subscription.module.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Badge variant="outline" className="text-xs">
                          Tier: {subscription.tier}
                        </Badge>
                        {subscription.module.status === 'BETA' && (
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20">
                            Beta
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
            {isOwner ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Firma loeschen
                </CardTitle>
                <CardDescription>
                  Diese Aktion kann nicht rueckgaengig gemacht werden. Alle Daten der Firma 
                  (Kunden, Tickets, Dateien, Benutzer-Zuordnungen) werden permanent geloescht.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Warnung: Diese Aktion ist unwiderruflich!
                  </p>
                  <ul className="mt-2 text-sm text-destructive/80 list-disc list-inside">
                    <li>Alle Kundendaten werden geloescht</li>
                    <li>Alle Tickets und Kommentare werden geloescht</li>
                    <li>Alle Dateien werden geloescht</li>
                    <li>Alle Benutzer werden aus der Firma entfernt</li>
                  </ul>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Firma unwiderruflich loeschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Firma wirklich loeschen?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>
                          Sie sind dabei, die Firma <strong>{currentCompany?.name}</strong> permanent zu loeschen. 
                          Alle Daten werden unwiderruflich entfernt.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="delete-confirm" className="text-foreground">
                            Geben Sie zur Bestaetigung den Firmennamen ein:
                          </Label>
                          <Input
                            id="delete-confirm"
                            placeholder={currentCompany?.name}
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="border-destructive"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                        Abbrechen
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCompany}
                        disabled={isDeleting || deleteConfirmation !== currentCompany?.name}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Wird geloescht...
                          </>
                        ) : (
                          'Firma endgueltig loeschen'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Diese Seite ist nur fuer Eigentuemer zugaenglich</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
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
                  {isOwner && ownerCount < 2 && (
                    <SelectItem value="OWNER">Eigentuemer</SelectItem>
                  )}
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
