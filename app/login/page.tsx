'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  useEffect(() => {
    // Prüfen ob Setup benötigt wird
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(data.needsSetup)
        setIsSetupMode(data.needsSetup)
      })
      .catch(() => {})
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      if (isSetupMode) {
        // Setup-Modus: Ersten Admin erstellen
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || 'Ein Fehler ist aufgetreten')
          return
        }
        
        // Nach Setup direkt einloggen
        setIsSetupMode(false)
        setNeedsSetup(false)
      }
      
      // Login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Ein Fehler ist aufgetreten')
        return
      }
      
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isSetupMode ? 'CRM Setup' : 'Anmelden'}
          </CardTitle>
          <CardDescription>
            {isSetupMode 
              ? 'Erstellen Sie den ersten Administrator-Account'
              : 'Melden Sie sich mit Ihren Zugangsdaten an'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Max Mustermann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder={isSetupMode ? 'Mindestens 8 Zeichen' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSetupMode ? 8 : undefined}
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bitte warten...
                </>
              ) : isSetupMode ? (
                'Account erstellen & Anmelden'
              ) : (
                'Anmelden'
              )}
            </Button>
            
            {needsSetup && !isSetupMode && (
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setIsSetupMode(true)}
              >
                Ersten Admin-Account erstellen
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
