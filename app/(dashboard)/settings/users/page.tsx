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
import { ArrowLeft, UserPlus, Loader2, Trash2, Edit2 } from 'lucide-react'

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
  }
}

export default function UsersSettingsPage() {
  const { user: currentUser, companyId } = useAuth()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    loadUsers()
  }, [companyId])

  const loadUsers = async () => {
    if (!companyId) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/users`)
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
    if (!selectedUser || !companyId) return

    try {
      const res = await fetch(`/api/companies/${companyId}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        loadUsers()
      }
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!companyId || !confirm('Benutzer wirklich löschen?')) return

    try {
      const res = await fetch(`/api/companies/${companyId}/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (!currentUser?.role?.includes('ADMIN')) {
    return (
      <main className="flex-1 space-y-6 p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Seite</p>
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
            <p className="text-muted-foreground">Verwalten Sie Benutzer und deren Rollen</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Benutzer einladen
        </Button>
      </div>

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
                  <TableHead>Rolle</TableHead>
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
                      <Badge variant="outline">{companyUser.role}</Badge>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(companyUser)
                          setNewRole(companyUser.role)
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Rolle ändern' : 'Benutzer einladen'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Ändern Sie die Rolle des Benutzers'
                : 'Laden Sie einen neuen Benutzer zu dieser Firma ein'}
            </DialogDescription>
          </DialogHeader>

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
                    <SelectItem value="OWNER">Eigentümer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="MEMBER">Mitglied</SelectItem>
                    <SelectItem value="VIEWER">Betrachter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="benutzer@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Rolle</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Wählen Sie eine Rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="MEMBER">Mitglied</SelectItem>
                    <SelectItem value="VIEWER">Betrachter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRoleChange}>
              {selectedUser ? 'Rolle ändern' : 'Einladung senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
