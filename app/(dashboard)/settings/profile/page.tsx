'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
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
import { Loader2, Save, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    theme: 'system',
  })
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswords(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          theme: formData.theme,
        }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      alert('Passwörter stimmen nicht überein')
      return
    }

    if (passwords.new.length < 8) {
      alert('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/users/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      })

      if (res.ok) {
        alert('Passwort erfolgreich geändert')
        setPasswords({ current: '', new: '', confirm: '' })
      } else {
        alert('Fehler beim Ändern des Passworts')
      }
    } catch (error) {
      console.error('Error changing password:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Kontoeinstellungen</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Profil-Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profilinformation</CardTitle>
            <CardDescription>Aktualisieren Sie Ihre persönlichen Daten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Vollständiger Name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail (Schreibgeschützt)</Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Rolle</Label>
              <Input
                value={user?.role || 'Unbekannt'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={formData.theme} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, theme: value }))
              }>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Hell</SelectItem>
                  <SelectItem value="dark">Dunkel</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Passwort ändern */}
        <Card>
          <CardHeader>
            <CardTitle>Sicherheit</CardTitle>
            <CardDescription>Ändern Sie Ihr Passwort</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Aktuelles Passwort</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  name="current"
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="new"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                name="confirm"
                type="password"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                placeholder="••••••••"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isSaving || !passwords.current || !passwords.new}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ändern...
                </>
              ) : (
                'Passwort ändern'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Konto-Information */}
        <Card>
          <CardHeader>
            <CardTitle>Konto-Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Benutzer-ID:</span>
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{user?.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="default">Aktiv</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
