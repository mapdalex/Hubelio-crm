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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  UserPlus,
  UserCheck,
  Package,
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

interface Module {
  moduleId: string
  name: string
  description: string
  icon: string
  basePrice: number
  status: 'ACTIVE' | 'BETA' | 'INACTIVE'
  features: string
}

export default function SuperadminPage() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCompanyForModules, setSelectedCompanyForModules] = useState<Company | null>(null)
  const [companySubscriptions, setCompanySubscriptions] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  // 'new' = neuen Benutzer anlegen, 'existing' = bestehenden per E-Mail hinzufuegen
  const [adminMode, setAdminMode] = useState<'new' | 'existing'>('new')
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyWebsite: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'FREE' as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE',
    includedModules: [] as string[],
  })
  
  // Plan-Konfiguration
  const PLAN_CONFIG = {
    FREE: { label: 'Free', includedModules: 0, description: 'Nur Core-Modul' },
    STARTER: { label: 'Starter', includedModules: 1, description: 'Core + 1 Modul nach Wahl' },
    PRO: { label: 'Pro', includedModules: 2, description: 'Core + 2 Module nach Wahl' },
    ENTERPRISE: { label: 'Enterprise', includedModules: Infinity, description: 'Core + alle Module nach Wahl' },
  }
  
  // Verfuegbare Module (ausser CORE)
  const availableModules = modules.filter(m => m.moduleId !== 'CORE')
  
  const [showAddOwnerDialog, setShowAddOwnerDialog] = useState(false)
  const [selectedCompanyForOwner, setSelectedCompanyForOwner] = useState<Company | null>(null)
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [isAddingOwner, setIsAddingOwner] = useState(false)
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    isActive: true,
  })

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [companiesRes, usersRes, modulesRes] = await Promise.all([
        fetch('/api/superadmin/companies'),
        fetch('/api/superadmin/users'),
        fetch('/api/superadmin/modules'),
      ])
      
      if (companiesRes.ok) {
        const data = await companiesRes.json()
        setCompanies(data.companies)
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }

      if (modulesRes.ok) {
        const data = await modulesRes.json()
        setModules(data)
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
        body: JSON.stringify({
          companyName: formData.companyName,
          companyEmail: formData.companyEmail,
          companyPhone: formData.companyPhone,
          companyAddress: formData.companyAddress,
          companyWebsite: formData.companyWebsite,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          createNewUser: adminMode === 'new',
          plan: formData.plan,
          includedModules: formData.includedModules,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen')
        return
      }
      
      setShowCreateDialog(false)
      setAdminMode('new')
      setFormData({
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyAddress: '',
        companyWebsite: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        plan: 'FREE',
        includedModules: [],
      })
      loadData()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setEditFormData({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address: '',
      website: '',
      isActive: company.isActive,
    })
    setError('')
    setShowEditDialog(true)
  }
  
  const handleSaveCompany = async () => {
    if (!editingCompany) return
    
    setIsSaving(true)
    setError('')
    
    try {
      const res = await fetch(`/api/superadmin/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Speichern')
        return
      }
      
      setShowEditDialog(false)
      setEditingCompany(null)
      loadData()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleToggleCompanyStatus = async (company: Company) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !company.isActive }),
      })
      
      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error('Error toggling company status:', err)
    }
  }
  
  const handleAddOwner = async () => {
    if (!selectedCompanyForOwner || !newOwnerEmail.trim()) return
    
    setIsAddingOwner(true)
    setError('')
    
    try {
      const res = await fetch(`/api/superadmin/companies/${selectedCompanyForOwner.id}/add-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newOwnerEmail }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Hinzufuegen')
        return
      }
      
      setShowAddOwnerDialog(false)
      setNewOwnerEmail('')
      setSelectedCompanyForOwner(null)
      loadData()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsAddingOwner(false)
    }
  }
  
  const loadCompanySubscriptions = async (companyId: string) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${companyId}/subscriptions`)
      if (res.ok) {
        const data = await res.json()
        setCompanySubscriptions(data)
      }
    } catch (err) {
      console.error('Error loading subscriptions:', err)
    }
  }

  const handleModuleSubscription = async (moduleId: string, tier: string) => {
    if (!selectedCompanyForModules) return

    try {
      const res = await fetch(
        `/api/superadmin/companies/${selectedCompanyForModules.id}/subscriptions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId, tier }),
        }
      )

      if (res.ok) {
        loadCompanySubscriptions(selectedCompanyForModules.id)
      }
    } catch (err) {
      console.error('Error updating subscription:', err)
    }
  }
  

  const getSubscriptionTier = (moduleId: string): string => {
    // Pruefe sowohl module.moduleId (Enum wie CORE) als auch moduleId (interne ID)
    const sub = companySubscriptions.find(s => 
      s.module?.moduleId === moduleId || s.moduleId === moduleId
    )
    return sub?.tier || ''
  }
  
  const getCoreTier = (): string => {
    return getSubscriptionTier('CORE') || 'FREE'
  }
  
  const isModuleActive = (moduleId: string): boolean => {
    // Pruefe sowohl module.moduleId (Enum wie CORE) als auch moduleId (interne ID)
    return companySubscriptions.some(s => 
      s.module?.moduleId === moduleId || s.moduleId === moduleId
    )
  }
  
  const getSubscriptionForModule = (moduleId: string) => {
    return companySubscriptions.find(s => 
      s.module?.moduleId === moduleId || s.moduleId === moduleId
    )
  }
  
  const handleToggleModule = async (moduleId: string, activate: boolean) => {
    if (!selectedCompanyForModules) return
    
    if (activate) {
      // Aktivieren mit dem aktuellen CORE-Plan
      const coreTier = getCoreTier()
      await handleModuleSubscription(moduleId, coreTier)
    } else {
      // Deaktivieren - Subscription loeschen
      try {
        const sub = getSubscriptionForModule(moduleId)
        if (sub) {
          // Verwende die interne moduleId (UUID) fuer das Loeschen
          const deleteModuleId = sub.moduleId
          await fetch(
            `/api/superadmin/companies/${selectedCompanyForModules.id}/subscriptions?moduleId=${deleteModuleId}`,
            { method: 'DELETE' }
          )
          loadCompanySubscriptions(selectedCompanyForModules.id)
        }
      } catch (err) {
        console.error('Error deactivating module:', err)
      }
    }
  }
  

  const getOwnerCount = (company: Company) => {
    return company.companyUsers.filter(cu => cu.role === 'OWNER').length
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

  const [upgradeStatus, setUpgradeStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [isUpgrading, setIsUpgrading] = useState(false)

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') {
      // Pruefe ob Upgrade moeglich ist
      fetch('/api/setup/upgrade-to-superadmin')
        .then(res => res.json())
        .then(data => {
          setUpgradeStatus(data.hasSuperadmin ? 'unavailable' : 'available')
        })
        .catch(() => setUpgradeStatus('unavailable'))
    }
  }, [user?.role])

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    try {
      const res = await fetch('/api/setup/upgrade-to-superadmin', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        window.location.reload()
      } else {
        alert(data.error)
      }
    } catch {
      alert('Fehler beim Upgrade')
    } finally {
      setIsUpgrading(false)
    }
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
          {upgradeStatus === 'available' && (
            <CardContent>
              <div className="p-3 bg-amber-50 text-amber-700 rounded-lg mb-4 text-sm">
                <p className="font-medium">Kein Superadmin vorhanden</p>
                <p>Sie koennen sich selbst zum Superadmin machen.</p>
              </div>
              <Button 
                onClick={handleUpgrade} 
                disabled={isUpgrading}
                className="w-full"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird aktualisiert...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Mich zum Superadmin machen
                  </>
                )}
              </Button>
            </CardContent>
          )}
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
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eigentuemer</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((acc, c) => acc + c.companyUsers.filter(cu => cu.role === 'OWNER').length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">max. 2 pro Firma</p>
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
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Module
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
                      <TableHead>Eigentuemer/Admins</TableHead>
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
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                                <Crown className="mr-1 h-3 w-3" />
                                                {getOwnerCount(company)}/2 Owner
                                              </Badge>
                                            </div>
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
                                                  <Badge 
                                                    variant="outline" 
                                                    className={cu.role === 'OWNER' 
                                                      ? 'text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' 
                                                      : 'text-xs'
                                                    }
                                                  >
                                                    {cu.role === 'OWNER' && <Crown className="mr-1 h-3 w-3" />}
                                                    {cu.role === 'OWNER' ? 'Eigentuemer' : cu.role}
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
                                              <DropdownMenuItem onClick={() => handleEditCompany(company)}>
                                                Bearbeiten
                                              </DropdownMenuItem>
                                              {getOwnerCount(company) < 2 && (
                                                <DropdownMenuItem 
                                                  onClick={() => {
                                                    setSelectedCompanyForOwner(company)
                                                    setShowAddOwnerDialog(true)
                                                    setError('')
                                                  }}
                                                >
                                                  <Crown className="mr-2 h-4 w-4" />
                                                  Eigentuemer hinzufuegen
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem 
                                                onClick={() => handleToggleCompanyStatus(company)}
                                                className={company.isActive ? 'text-destructive' : 'text-green-600'}
                                              >
                                                {company.isActive ? (
                                                  <>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Deaktivieren
                                                  </>
                                                ) : (
                                                  'Aktivieren'
                                                )}
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

        <TabsContent value="modules" className="space-y-4">
          {/* Module initialisieren Card */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Module initialisieren
              </CardTitle>
              <CardDescription>
                Falls keine Module angezeigt werden, initialisieren Sie diese hier einmalig.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/superadmin/modules/seed', { method: 'POST' })
                    const data = await res.json()
                    if (res.ok) {
                      alert(data.message)
                      loadData()
                    } else {
                      const errorMsg = data.details 
                        ? `${data.error}\n\nDetails: ${data.details}\n\nHinweis: ${data.hint || ''}`
                        : data.error || 'Fehler beim Initialisieren'
                      alert(errorMsg)
                    }
                  } catch (err) {
                    alert('Verbindungsfehler')
                  }
                }}
              >
                Module in Datenbank erstellen
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Erstellt die 9 Standard-Module (CORE, MESSAGE, SALES, IT, SOCIALS, CAMPAIGNS, ANALYTICS, FINANCE, RENT)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Module verwalten
              </CardTitle>
              <CardDescription>
                Module zu Firmen hinzufuegen/entfernen und Abo-Stufen konfigurieren
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Firma auswaehlen</Label>
                  <Select
                    value={selectedCompanyForModules?.id || ''}
                    onValueChange={(value) => {
                      const company = companies.find(c => c.id === value)
                      if (company) {
                        setSelectedCompanyForModules(company)
                        loadCompanySubscriptions(company.id)
                      } else {
                        setSelectedCompanyForModules(null)
                        setCompanySubscriptions([])
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Waehlen Sie eine Firma --" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verfuegbare Firmen: {companies.length}
                  </p>
                </div>
  
                {selectedCompanyForModules && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Module fuer: {selectedCompanyForModules.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {companySubscriptions.length} aktive Subscriptions
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {modules.length} Module verfuegbar
                        </Badge>
                      </div>
                    </div>
                    
                    {modules.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Keine Module verfuegbar. Bitte erstellen Sie zuerst Module.
                      </div>
                    ) : (
                      <>
                        {/* CORE Modul mit Plan-Auswahl */}
                        {modules.filter(m => m.moduleId === 'CORE').map((module) => {
                          const currentTier = getSubscriptionTier(module.moduleId)
                          return (
                            <div key={module.moduleId} className="p-4 border rounded-lg bg-primary/5 border-primary">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{module.name}</h3>
                                    <Badge variant="default" className="text-xs">Basis-Modul</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{module.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Aktueller Plan: {currentTier || 'Nicht gesetzt'}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  <Label className="text-xs text-muted-foreground">Abo-Plan</Label>
                                  <Select
                                    value={currentTier || 'FREE'}
                                    onValueChange={(value) => handleModuleSubscription(module.moduleId, value)}
                                  >
                                    <SelectTrigger className="min-w-[160px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="FREE">Free (0 Module)</SelectItem>
                                      <SelectItem value="STARTER">Starter (1 Modul)</SelectItem>
                                      <SelectItem value="PRO">Pro (2 Module)</SelectItem>
                                      <SelectItem value="ENTERPRISE">Enterprise (alle Module)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => handleModuleSubscription(module.moduleId, currentTier || 'FREE')}
                                  >
                                    Plan speichern
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {/* Trennlinie */}
                        <div className="pt-2">
                          <h4 className="font-medium mb-2">Zusatzmodule</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Als Superadmin koennen Sie beliebig viele Module aktivieren.
                          </p>
                        </div>
                        
                        {/* Andere Module mit Checkbox */}
                        <div className="grid gap-3">
                          {modules.filter(m => m.moduleId !== 'CORE').map((module) => {
                            const isActive = isModuleActive(module.moduleId)
                            return (
                              <div 
                                key={module.moduleId} 
                                className={`p-4 border rounded-lg ${isActive ? 'border-primary/50 bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1">
                                    <Checkbox
                                      id={`inline-module-${module.moduleId}`}
                                      checked={isActive}
                                      onCheckedChange={(checked) => handleToggleModule(module.moduleId, !!checked)}
                                      className="h-5 w-5"
                                    />
                                    <label 
                                      htmlFor={`inline-module-${module.moduleId}`}
                                      className="flex-1 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{module.name}</h3>
                                        {isActive && (
                                          <Badge variant="default" className="text-xs">Aktiv</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{module.description}</p>
                                    </label>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant={isActive ? "destructive" : "default"}
                                    onClick={() => handleToggleModule(module.moduleId, !isActive)}
                                  >
                                    {isActive ? 'Deaktivieren' : 'Aktivieren'}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            
            <div className="border-t pt-4 space-y-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Firmen-Admin (wird Owner)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Dieser Benutzer wird als Owner der Firma angelegt.
                </p>
              </div>

              {/* Toggle: Neuer Benutzer oder bestehender */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdminMode('new')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                    adminMode === 'new'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Neuen Benutzer anlegen
                </button>
                <button
                  type="button"
                  onClick={() => setAdminMode('existing')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-l ${
                    adminMode === 'existing'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Bestehenden hinzufuegen
                </button>
              </div>

              {adminMode === 'new' ? (
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
              ) : (
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="adminEmailExisting">E-Mail des bestehenden Benutzers *</Label>
                    <Input
                      id="adminEmailExisting"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="benutzer@beispiel.de"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Der Benutzer muss bereits im System vorhanden sein.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Plan-Auswahl */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Abo-Plan
                </h4>
                <p className="text-sm text-muted-foreground">
                  Waehlen Sie den Plan fuer die Firma.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PLAN_CONFIG) as [keyof typeof PLAN_CONFIG, typeof PLAN_CONFIG[keyof typeof PLAN_CONFIG]][]).map(([planKey, config]) => (
                  <button
                    key={planKey}
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      plan: planKey as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE',
                      includedModules: [] // Reset bei Plan-Wechsel
                    })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.plan === planKey
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="font-medium">{config.label}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </button>
                ))}
              </div>
              
              {/* Modul-Auswahl wenn Plan > FREE */}
              {PLAN_CONFIG[formData.plan].includedModules > 0 && (
                <div className="space-y-2 mt-3">
                  <Label>
                    Module auswaehlen ({formData.includedModules.length}{PLAN_CONFIG[formData.plan].includedModules === Infinity ? '' : `/${PLAN_CONFIG[formData.plan].includedModules}`})
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableModules.map((mod) => {
                      const isSelected = formData.includedModules.includes(mod.moduleId)
                      const canSelect = isSelected || formData.includedModules.length < PLAN_CONFIG[formData.plan].includedModules
                      
                      return (
                        <button
                          key={mod.moduleId}
                          type="button"
                          disabled={!canSelect && !isSelected}
                          onClick={() => {
                            if (isSelected) {
                              setFormData({
                                ...formData,
                                includedModules: formData.includedModules.filter(m => m !== mod.moduleId)
                              })
                            } else if (canSelect) {
                              setFormData({
                                ...formData,
                                includedModules: [...formData.includedModules, mod.moduleId]
                              })
                            }
                          }}
                          className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : canSelect
                              ? 'border-border hover:border-muted-foreground/50'
                              : 'border-border opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="font-medium">{mod.name}</div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Weitere Module koennen spaeter hinzugebucht werden.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateCompany}
              disabled={
                isCreating || 
                !formData.companyName || 
                !formData.adminEmail ||
                (adminMode === 'new' && (!formData.adminName || !formData.adminPassword))
              }
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

      {/* Edit Company Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) {
          setEditingCompany(null)
          setError('')
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Firma bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Firmendaten von {editingCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Firmenname *</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editEmail">E-Mail</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Telefon</Label>
                <Input
                  id="editPhone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editAddress">Adresse</Label>
              <Input
                id="editAddress"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editWebsite">Website</Label>
              <Input
                id="editWebsite"
                value={editFormData.website}
                onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">
                  {editFormData.isActive ? 'Firma ist aktiv' : 'Firma ist deaktiviert'}
                </p>
              </div>
              <Button
                variant={editFormData.isActive ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
              >
                {editFormData.isActive ? 'Deaktivieren' : 'Aktivieren'}
              </Button>
            </div>
            
            {/* Liste der Firmen-Admins */}
            {editingCompany && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">Firmen-Admins</Label>
                <div className="space-y-2">
                  {editingCompany.companyUsers
                    .filter(cu => ['OWNER', 'ADMIN'].includes(cu.role))
                    .map(cu => (
                      <div key={cu.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(cu.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{cu.user.name}</div>
                            <div className="text-xs text-muted-foreground">{cu.user.email}</div>
                          </div>
                        </div>
                        <Badge variant={cu.role === 'OWNER' ? 'default' : 'secondary'}>
                          {cu.role}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveCompany}
              disabled={isSaving || !editFormData.name}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Owner Dialog */}
      <Dialog open={showAddOwnerDialog} onOpenChange={(open) => {
        setShowAddOwnerDialog(open)
        if (!open) {
          setSelectedCompanyForOwner(null)
          setNewOwnerEmail('')
          setError('')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Eigentuemer hinzufuegen
            </DialogTitle>
            <DialogDescription>
              Fuegen Sie einen weiteren Eigentuemer zu {selectedCompanyForOwner?.name} hinzu.
              <br />
              <span className="text-amber-600 font-medium">
                Maximal 2 Eigentuemer pro Firma erlaubt.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ownerEmail">E-Mail des Benutzers *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="benutzer@beispiel.de"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Der Benutzer muss bereits im System existieren.
              </p>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Crown className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    Eigentuemer-Berechtigungen
                  </p>
                  <ul className="text-amber-700 dark:text-amber-500 mt-1 list-disc list-inside">
                    <li>Kann die Firma permanent loeschen</li>
                    <li>Hat alle Admin-Rechte</li>
                    <li>Kann andere Eigentuemer ernennen</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddOwnerDialog(false)}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleAddOwner}
              disabled={isAddingOwner || !newOwnerEmail.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isAddingOwner ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird hinzugefuegt...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Als Eigentuemer hinzufuegen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

    </div>
  )
}
