'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Building2, 
  Users, 
  Plus, 
  MoreVertical, 
  Shield,
  Loader2,
  Crown,
  UserCog,
  Trash2,
} from 'lucide-react'

interface Company {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  companyUsers: {
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
      role: string
      isActive: boolean
    }
  }[]
  _count: {
    customers: number
    tickets: number
    companyUsers: number
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin: string | null
  companyUsers: {
    role: string
    company: {
      id: string
      name: string
      slug: string
    }
  }[]
}

export default function SuperadminPage() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyWebsite: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [companiesRes, usersRes] = await Promise.all([
        fetch('/api/superadmin/companies'),
        fetch('/api/superadmin/users'),
      ])
      
      if (companiesRes.ok) {
        const data = await companiesRes.json()
        setCompanies(data.companies)
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCompany = async () => {
    setIsCreating(true)
    setError('')
    
    try {
      const res = await fetch('/api/superadmin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen')
        return
      }
      
      setShowCreateDialog(false)
      setFormData({
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyAddress: '',
        companyWebsite: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      })
      loadData()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsCreating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      SUPERADMIN: { variant: 'destructive', icon: <Crown className="mr-1 h-3 w-3" /> },
      ADMIN: { variant: 'default', icon: <Shield className="mr-1 h-3 w-3" /> },
      OWNER: { variant: 'default', icon: <Crown className="mr-1 h-3 w-3" /> },
      MANAGER: { variant: 'secondary', icon: <UserCog className="mr-1 h-3 w-3" /> },
      MEMBER: { variant: 'outline', icon: null },
      VIEWER: { variant: 'outline', icon: null },
    }
    
    const config = variants[role] || { variant: 'outline' as const, icon: null }
    
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {role}
      </Badge>
    )
  }

  if (user?.role !== 'SUPERADMIN') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Zugriff verweigert
            </CardTitle>
            <CardDescription>
              Diese Seite ist nur fuer den Superadmin zugaenglich.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-amber-500" />
            Superadmin-Verwaltung
          </h1>
          <p className="text-muted-foreground">
            Firmen und Benutzer systemweit verwalten
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Firma erstellen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmen</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benutzer gesamt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmen-Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'ADMIN').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firmen
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alle Benutzer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>Alle Firmen</CardTitle>
              <CardDescription>
                Verwalten Sie alle Firmen im System und deren Admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine Firmen erstellt
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firma</TableHead>
                      <TableHead>Owner/Admins</TableHead>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>Kunden</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-muted-foreground">{company.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {company.companyUsers
                              .filter(cu => ['OWNER', 'ADMIN'].includes(cu.role))
                              .slice(0, 2)
                              .map(cu => (
                                <div key={cu.id} className="flex items-center gap-2 text-sm">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(cu.user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{cu.user.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {cu.role}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>{company._count.companyUsers}</TableCell>
                        <TableCell>{company._count.customers}</TableCell>
                        <TableCell>
                          <Badge variant={company.isActive ? 'default' : 'secondary'}>
                            {company.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                              <DropdownMenuItem>Benutzer verwalten</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deaktivieren
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Alle Benutzer</CardTitle>
              <CardDescription>
                Uebersicht aller Benutzer im System
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benutzer</TableHead>
                      <TableHead>System-Rolle</TableHead>
                      <TableHead>Firmen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Letzter Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {u.companyUsers.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Keine Firma</span>
                            ) : (
                              u.companyUsers.slice(0, 2).map((cu, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <span>{cu.company.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {cu.role}
                                  </Badge>
                                </div>
                              ))
                            )}
                            {u.companyUsers.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{u.companyUsers.length - 2} weitere
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'default' : 'secondary'}>
                            {u.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleDateString('de-DE')
                            : 'Nie'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Firma erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Firma und weisen Sie einen Admin zu.
              Der Admin kann dann weitere Benutzer fuer seine Firma hinzufuegen.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Firmendaten
              </h4>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="companyName">Firmenname *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Beispiel GmbH"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="companyEmail">E-Mail</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      placeholder="info@beispiel.de"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone">Telefon</Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Firmen-Admin (wird Owner)
              </h4>
              <p className="text-sm text-muted-foreground">
                Dieser Benutzer wird als Owner der Firma angelegt und kann weitere Benutzer hinzufuegen.
              </p>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="adminName">Name *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <Label htmlFor="adminEmail">E-Mail *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@beispiel.de"
                  />
                </div>
                <div>
                  <Label htmlFor="adminPassword">Passwort *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="Mindestens 8 Zeichen"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateCompany}
              disabled={isCreating || !formData.companyName || !formData.adminName || !formData.adminEmail || !formData.adminPassword}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                'Firma erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
