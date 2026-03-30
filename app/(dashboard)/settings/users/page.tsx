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
import { ArrowLeft, UserPlus, Loader2, Trash2, Edit2, Shield, Crown, UserCog, Eye, User } from 'lucide-react'

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
}

// Firmen-Admins (OWNER/ADMIN) koennen nur diese Rollen vergeben
const ASSIGNABLE_ROLES = ['MANAGER', 'MEMBER', 'VIEWER']
// OWNER kann auch ADMIN vergeben
const OWNER_ASSIGNABLE_ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']

export default function UsersSettingsPage() {
  const { user: currentUser, currentCompany, companyRole } = useAuth()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null)
  const [newRole, setNewRole] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  
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

  const handleRoleChange = async () => {
    if (!selectedUser || !currentCompany?.id) return

    try {
      const res = await fetch(`/api/companies/${currentCompany.id}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setSelectedUser(null)
        loadUsers()
      }
    } catch (error) {
      console.error('Error updating user role:', error)
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
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Fehler beim Erstellen')
        return
      }
      
      setIsDialogOpen(false)
      setNewUserData({ name: '', email: '', password: '', role: 'MEMBER' })
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

  const canEditUser = (targetRole: string) => {
    // OWNER kann alle bearbeiten
    if (isOwner) return true
    // ADMIN kann nur MANAGER, MEMBER, VIEWER bearbeiten
    if (companyRole === 'ADMIN') return ['MANAGER', 'MEMBER', 'VIEWER'].includes(targetRole)
    // MANAGER kann nur MEMBER und VIEWER bearbeiten
    if (companyRole === 'MANAGER') return ['MEMBER', 'VIEWER'].includes(targetRole)
    return false
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
        <Button onClick={() => {
          setSelectedUser(null)
          setNewUserData({ name: '', email: '', password: '', role: 'MEMBER' })
          setError('')
          setIsDialogOpen(true)
        }}>
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
                {isOwner && 'Sie koennen alle Rollen vergeben: Admin, Manager, Mitglied und Betrachter.'}
                {companyRole === 'ADMIN' && 'Sie koennen Manager, Mitglieder und Betrachter hinzufuegen.'}
                {companyRole === 'MANAGER' && 'Sie koennen Mitglieder und Betrachter hinzufuegen.'}
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
                            onClick={() => {
                              setSelectedUser(companyUser)
                              setNewRole(companyUser.role)
                              setError('')
                              setIsDialogOpen(true)
                            }}
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
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Rolle aendern' : 'Neuen Benutzer hinzufuegen'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Aendern Sie die Rolle des Benutzers in Ihrer Firma'
                : 'Erstellen Sie einen neuen Benutzer fuer Ihre Firma'}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {selectedUser ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Benutzer</Label>
                <Input
                  value={selectedUser.user.name}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Neue Rolle</Label>
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
            </div>
          ) : (
            <div className="space-y-4">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            {selectedUser ? (
              <Button onClick={handleRoleChange}>
                Rolle aendern
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
