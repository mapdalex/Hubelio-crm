'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, UserPlus, Loader2, Trash2, Edit2, Shield, Crown, UserCog, Eye, User, Package } from 'lucide-react'

type ModulePermission = {
  moduleId: string
  canAccess: boolean
  canEdit: boolean
  canAdmin: boolean
}

type CompanyUser = {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
    lastLogin: string | null
    role: string
  }
  modulePermissions?: ModulePermission[]
}

type CompanyModule = {
  id: string
  moduleId: string
  name: string
  description: string | null
  icon: string | null
}

// Firmen-Admins (OWNER/ADMIN) koennen nur diese Rollen vergeben
const ASSIGNABLE_ROLES = ['MANAGER', 'MEMBER', 'VIEWER']
// OWNER kann auch ADMIN vergeben
const OWNER_ASSIGNABLE_ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']

// Modul-Namen fuer Anzeige
const MODULE_NAMES: Record<string, string> = {
  CORE: 'Kern-Funktionen',
  MESSAGE: 'Nachrichten',
  SALES: 'Vertrieb',
  IT: 'IT-Verwaltung',
  SOCIALS: 'Social Media',
  CAMPAIGNS: 'Kampagnen',
  ANALYTICS: 'Analytics',
}

// Modul-Icons fuer Anzeige
const MODULE_ICONS: Record<string, string> = {
  CORE: 'settings',
  MESSAGE: 'mail',
  SALES: 'trending-up',
  IT: 'monitor',
  SOCIALS: 'share-2',
  CAMPAIGNS: 'megaphone',
  ANALYTICS: 'bar-chart-2',
}

export default function UsersSettingsPage() {
  const { user: currentUser, currentCompany, companyRole } = useAuth()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [companyModules, setCompanyModules] = useState<CompanyModule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null)
  const [newRole, setNewRole] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Modul-Berechtigungen im Dialog
  const [selectedModulePermissions, setSelectedModulePermissions] = useState<ModulePermission[]>([])
  
  // Fuer neuen Benutzer
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER',
  })

  const isOwner = companyRole === 'OWNER'
  const canManageUsers = companyRole === 'OWNER' || companyRole === 'ADMIN' || companyRole === 'MANAGER'
  const assignableRoles = isOwner ? OWNER_ASSIGNABLE_ROLES : ASSIGNABLE_ROLES

  useEffect(() => {
    if (currentCompany?.id) {
      loadUsers()
      loadCompanyModules()
    }
  }, [currentCompany?.id])

  const loadUsers = async () => {
    if (!currentCompany?.id) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${currentCompany.id}/users`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompanyModules = async () => {
    if (!currentCompany?.id) return
    
    try {
      const res = await fetch(`/api/companies/${currentCompany.id}/subscriptions`)
      console.log('[v0] Subscriptions API response status:', res.status)
      if (res.ok) {
        // Die API gibt das Array direkt zurueck (kein Wrapper-Objekt)
        const data = await res.json()
        console.log('[v0] Subscriptions raw data:', data)
        const subscriptionsArray = Array.isArray(data) ? data : (data.subscriptions ?? [])
        console.log('[v0] Subscriptions array:', subscriptionsArray)
        const activeModules = subscriptionsArray
          .filter((sub: { status: string }) => sub.status === 'ACTIVE' || sub.status === 'TRIAL')
          .map((sub: { module: CompanyModule }) => sub.module)
        console.log('[v0] Active modules:', activeModules)
        setCompanyModules(activeModules)
      } else {
        console.log('[v0] Subscriptions API error:', await res.text())
      }
    } catch (error) {
      console.error('Error loading company modules:', error)
    }
  }

  const initializeModulePermissions = (existingPermissions?: ModulePermission[]) => {
    // Erstelle Permissions fuer alle verfuegbaren Module
    const permissions: ModulePermission[] = companyModules.map(mod => {
      const existing = existingPermissions?.find(p => p.moduleId === mod.moduleId)
      return {
        moduleId: mod.moduleId,
        canAccess: existing?.canAccess ?? false,
        canEdit: existing?.canEdit ?? false,
        canAdmin: existing?.canAdmin ?? false,
      }
    })
    setSelectedModulePermissions(permissions)
  }

  const handleModulePermissionChange = (moduleId: string, field: 'canAccess' | 'canEdit' | 'canAdmin', value: boolean) => {
    setSelectedModulePermissions(prev => prev.map(perm => {
      if (perm.moduleId !== moduleId) return perm
      
      const updated = { ...perm, [field]: value }
      
      // Wenn canAccess deaktiviert wird, auch canEdit und canAdmin deaktivieren
      if (field === 'canAccess' && !value) {
        updated.canEdit = false
        updated.canAdmin = false
      }
      // Wenn canEdit oder canAdmin aktiviert wird, auch canAccess aktivieren
      if ((field === 'canEdit' || field === 'canAdmin') && value) {
        updated.canAccess = true
      }
      // Wenn canAdmin aktiviert wird, auch canEdit aktivieren
      if (field === 'canAdmin' && value) {
        updated.canEdit = true
      }
      
      return updated
    }))
  }

  const handleSaveUser = async () => {
    if (!currentCompany?.id) return
    
    setIsSaving(true)
    setError('')
    
    try {
      if (selectedUser) {
        // Update existing user
        const res = await fetch(`/api/companies/${currentCompany.id}/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            role: newRole,
            modulePermissions: selectedModulePermissions.filter(p => p.canAccess),
          }),
        })
        
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || 'Fehler beim Speichern')
          return
        }
      }
      
      setIsDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateUser = async () => {
    if (!currentCompany?.id) return
    
    setIsCreating(true)
    setError('')
    
    try {
      const res = await fetch(`/api/companies/${currentCompany.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUserData,
          createNewUser: true,
          modulePermissions: selectedModulePermissions.filter(p => p.canAccess),
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen')
        return
      }
      
      setIsDialogOpen(false)
      setNewUserData({ name: '', email: '', password: '', role: 'MEMBER' })
      setSelectedModulePermissions([])
      loadUsers()
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!currentCompany?.id || !confirm('Benutzer wirklich aus der Firma entfernen?')) return

    try {
      const res = await fetch(`/api/companies/${currentCompany.id}/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const openEditDialog = (companyUser: CompanyUser) => {
    setSelectedUser(companyUser)
    setNewRole(companyUser.role)
    initializeModulePermissions(companyUser.modulePermissions)
    setError('')
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setSelectedUser(null)
    setNewUserData({ name: '', email: '', password: '', role: 'MEMBER' })
    initializeModulePermissions([])
    setError('')
    setIsDialogOpen(true)
  }

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; icon: React.ReactNode; label: string }> = {
      OWNER: { variant: 'default', icon: <Crown className="mr-1 h-3 w-3" />, label: 'Eigentuemer' },
      ADMIN: { variant: 'default', icon: <Shield className="mr-1 h-3 w-3" />, label: 'Admin' },
      MANAGER: { variant: 'secondary', icon: <UserCog className="mr-1 h-3 w-3" />, label: 'Manager' },
      MEMBER: { variant: 'outline', icon: <User className="mr-1 h-3 w-3" />, label: 'Mitglied' },
      VIEWER: { variant: 'outline', icon: <Eye className="mr-1 h-3 w-3" />, label: 'Betrachter' },
    }
    
    const cfg = config[role] || { variant: 'outline' as const, icon: null, label: role }
    
    return (
      <Badge variant={cfg.variant} className="flex items-center w-fit">
        {cfg.icon}
        {cfg.label}
      </Badge>
    )
  }

  const getModuleAccessBadges = (permissions?: ModulePermission[]) => {
    if (!permissions || permissions.length === 0) return null
    
    const accessibleModules = permissions.filter(p => p.canAccess)
    if (accessibleModules.length === 0) return <span className="text-muted-foreground text-sm">Keine Module</span>
    
    return (
      <div className="flex flex-wrap gap-1">
        {accessibleModules.slice(0, 3).map(perm => (
          <Badge key={perm.moduleId} variant="outline" className="text-xs">
            {MODULE_NAMES[perm.moduleId] || perm.moduleId}
          </Badge>
        ))}
        {accessibleModules.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{accessibleModules.length - 3}
          </Badge>
        )}
      </div>
    )
  }

  const canEditUser = (targetRole: string) => {
    // OWNER kann alle bearbeiten
    if (isOwner) return true
    // ADMIN kann nur MANAGER, MEMBER, VIEWER bearbeiten
    if (companyRole === 'ADMIN') return ['MANAGER', 'MEMBER', 'VIEWER'].includes(targetRole)
    // MANAGER kann nur MEMBER und VIEWER bearbeiten
    if (companyRole === 'MANAGER') return ['MEMBER', 'VIEWER'].includes(targetRole)
    return false
  }

  // Pruefe ob der Benutzer individuelle Modul-Berechtigungen benoetigt
  // OWNER, ADMIN und MANAGER haben automatisch alle Module
  // Nur MEMBER und VIEWER bekommen individuelle Zuweisungen
  const needsModulePermissions = (role: string) => {
    return ['MEMBER', 'VIEWER'].includes(role)
  }

  if (!canManageUsers) {
    return (
      <main className="flex-1 space-y-6 p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Sie haben keine Berechtigung fuer diese Seite</p>
        </div>
      </main>
    )
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
            <h1 className="text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Benutzer Ihrer Firma: {currentCompany?.name}
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Benutzer hinzufuegen
        </Button>
      </div>

      {/* Info-Box fuer Rollen-Berechtigungen */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Ihre Berechtigungen als {companyRole}</p>
              <p className="text-muted-foreground">
                {isOwner && 'Sie koennen alle Rollen vergeben und Modulzugriffe fuer alle Benutzer konfigurieren.'}
                {companyRole === 'ADMIN' && 'Sie koennen Manager, Mitglieder und Betrachter hinzufuegen und deren Modulzugriffe verwalten.'}
                {companyRole === 'MANAGER' && 'Sie koennen Mitglieder und Betrachter hinzufuegen und deren Modulzugriffe verwalten.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benutzer</CardTitle>
          <CardDescription>Alle Benutzer in dieser Firma</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Keine Benutzer gefunden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Firmen-Rolle</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Beigetreten</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((companyUser) => (
                  <TableRow key={companyUser.id}>
                    <TableCell className="font-medium">{companyUser.user.name}</TableCell>
                    <TableCell>{companyUser.user.email}</TableCell>
                    <TableCell>
                      {getRoleBadge(companyUser.role)}
                    </TableCell>
                    <TableCell>
                      {['OWNER', 'ADMIN', 'MANAGER'].includes(companyUser.role) ? (
                        <span className="text-sm text-muted-foreground">Alle Module</span>
                      ) : (
                        getModuleAccessBadges(companyUser.modulePermissions)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={companyUser.user.isActive ? 'default' : 'secondary'}>
                        {companyUser.user.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(companyUser.joinedAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditUser(companyUser.role) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(companyUser)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {companyUser.user.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(companyUser.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setSelectedUser(null)
          setError('')
          setSelectedModulePermissions([])
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer hinzufuegen'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Aendern Sie Rolle und Modulzugriffe des Benutzers'
                : 'Erstellen Sie einen neuen Benutzer und weisen Sie Modulzugriffe zu'}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {selectedUser ? (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label>Benutzer</Label>
                <Input
                  value={selectedUser.user.name}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rolle</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role === 'ADMIN' && 'Admin'}
                        {role === 'MANAGER' && 'Manager'}
                        {role === 'MEMBER' && 'Mitglied'}
                        {role === 'VIEWER' && 'Betrachter'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Modul-Berechtigungen nur fuer nicht-Admin Rollen */}
              {needsModulePermissions(newRole) && companyModules.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <Label className="text-base font-semibold">Modulzugriffe</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Waehlen Sie die Module, auf die dieser Benutzer Zugriff haben soll. 
                      Nur Module, die fuer Ihre Firma freigeschaltet sind, stehen zur Verfuegung.
                    </p>
                    
                    <div className="space-y-3">
                      {companyModules.map((mod) => {
                        const perm = selectedModulePermissions.find(p => p.moduleId === mod.moduleId)
                        return (
                          <Card key={mod.moduleId} className={perm?.canAccess ? 'border-primary/50' : ''}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`access-${mod.moduleId}`}
                                      checked={perm?.canAccess ?? false}
                                      onCheckedChange={(checked) => 
                                        handleModulePermissionChange(mod.moduleId, 'canAccess', !!checked)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`access-${mod.moduleId}`}
                                      className="font-medium cursor-pointer"
                                    >
                                      {MODULE_NAMES[mod.moduleId] || mod.name}
                                    </Label>
                                  </div>
                                  {mod.description && (
                                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                                      {mod.description}
                                    </p>
                                  )}
                                </div>
                                
                                {perm?.canAccess && (
                                  <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`edit-${mod.moduleId}`}
                                        checked={perm?.canEdit ?? false}
                                        onCheckedChange={(checked) => 
                                          handleModulePermissionChange(mod.moduleId, 'canEdit', !!checked)
                                        }
                                      />
                                      <Label 
                                        htmlFor={`edit-${mod.moduleId}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        Bearbeiten
                                      </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`admin-${mod.moduleId}`}
                                        checked={perm?.canAdmin ?? false}
                                        onCheckedChange={(checked) => 
                                          handleModulePermissionChange(mod.moduleId, 'canAdmin', !!checked)
                                        }
                                      />
                                      <Label 
                                        htmlFor={`admin-${mod.moduleId}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        Verwalten
                                      </Label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
              
              {needsModulePermissions(newRole) && companyModules.length === 0 && (
                <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p>Keine zusaetzlichen Module fuer diese Firma freigeschaltet.</p>
                  <p>Der Benutzer hat Zugriff auf die Kern-Funktionen.</p>
                </div>
              )}
              
              {!needsModulePermissions(newRole) && (
                <div className="p-4 bg-primary/10 rounded-lg text-sm">
                  <p className="font-medium">Hinweis: Diese Rolle hat automatisch alle Module</p>
                  <p className="text-muted-foreground">
                    Owner, Admins und Manager haben automatisch Zugriff auf alle Module,
                    die fuer diese Firma freigeschaltet sind.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail-Adresse *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="benutzer@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Passwort *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Rolle</Label>
                <Select 
                  value={newUserData.role} 
                  onValueChange={(val) => setNewUserData({ ...newUserData, role: val })}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Waehlen Sie eine Rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role === 'ADMIN' && 'Admin'}
                        {role === 'MANAGER' && 'Manager'}
                        {role === 'MEMBER' && 'Mitglied'}
                        {role === 'VIEWER' && 'Betrachter'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Modul-Berechtigungen fuer neuen Benutzer */}
              {needsModulePermissions(newUserData.role) && companyModules.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <Label className="text-base font-semibold">Modulzugriffe</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Waehlen Sie die Module, auf die dieser Benutzer Zugriff haben soll.
                    </p>
                    
                    <div className="space-y-3">
                      {companyModules.map((mod) => {
                        const perm = selectedModulePermissions.find(p => p.moduleId === mod.moduleId)
                        return (
                          <Card key={mod.moduleId} className={perm?.canAccess ? 'border-primary/50' : ''}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`new-access-${mod.moduleId}`}
                                      checked={perm?.canAccess ?? false}
                                      onCheckedChange={(checked) => 
                                        handleModulePermissionChange(mod.moduleId, 'canAccess', !!checked)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`new-access-${mod.moduleId}`}
                                      className="font-medium cursor-pointer"
                                    >
                                      {MODULE_NAMES[mod.moduleId] || mod.name}
                                    </Label>
                                  </div>
                                  {mod.description && (
                                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                                      {mod.description}
                                    </p>
                                  )}
                                </div>
                                
                                {perm?.canAccess && (
                                  <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`new-edit-${mod.moduleId}`}
                                        checked={perm?.canEdit ?? false}
                                        onCheckedChange={(checked) => 
                                          handleModulePermissionChange(mod.moduleId, 'canEdit', !!checked)
                                        }
                                      />
                                      <Label 
                                        htmlFor={`new-edit-${mod.moduleId}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        Bearbeiten
                                      </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`new-admin-${mod.moduleId}`}
                                        checked={perm?.canAdmin ?? false}
                                        onCheckedChange={(checked) => 
                                          handleModulePermissionChange(mod.moduleId, 'canAdmin', !!checked)
                                        }
                                      />
                                      <Label 
                                        htmlFor={`new-admin-${mod.moduleId}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        Verwalten
                                      </Label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
              
              {!needsModulePermissions(newUserData.role) && (
                <div className="p-4 bg-primary/10 rounded-lg text-sm">
                  <p className="font-medium">Hinweis: Diese Rolle hat automatisch alle Module</p>
                  <p className="text-muted-foreground">
                    Owner, Admins und Manager haben automatisch Zugriff auf alle Module,
                    die fuer diese Firma freigeschaltet sind.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            {selectedUser ? (
              <Button onClick={handleSaveUser} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Speichern'
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleCreateUser}
                disabled={isCreating || !newUserData.name || !newUserData.email || !newUserData.password}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  'Benutzer erstellen'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
