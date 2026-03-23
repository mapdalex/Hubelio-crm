'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2, Database, User, Settings, ArrowRight } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSetup, setCheckingSetup] = useState(true)
  
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: ''
  })

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/auth/setup')
      const data = await res.json()
      
      if (data.isSetupComplete) {
        router.push('/login')
      }
    } catch {
      // Setup noch nicht abgeschlossen
    } finally {
      setCheckingSetup(false)
    }
  }

  const handleSetup = async () => {
    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwoerter stimmen nicht ueberein')
      return
    }

    if (adminData.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adminData,
          ...companyData
        })
      })

      const data = await res.json()

      if (res.ok) {
        setStep(4)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(data.error || 'Fehler beim Setup')
      }
    } catch {
      setError('Verbindungsfehler')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CRM System einrichten</CardTitle>
          <CardDescription>
            Schritt {step} von 3: {step === 1 ? 'Administrator' : step === 2 ? 'Firmendaten' : step === 3 ? 'Bestaetigung' : 'Abgeschlossen'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${s < step ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Admin User */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Administrator-Konto</h3>
                  <p className="text-sm text-muted-foreground">Erstellen Sie den ersten Admin-Benutzer</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestaetigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                  placeholder="Passwort wiederholen"
                />
              </div>

              <Button 
                className="w-full mt-6" 
                onClick={() => setStep(2)}
                disabled={!adminData.name || !adminData.email || !adminData.password}
              >
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Company Data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Firmendaten</h3>
                  <p className="text-sm text-muted-foreground">Grundlegende Informationen (optional)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  value={companyData.companyName}
                  onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                  placeholder="Meine Firma GmbH"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyEmail">Firmen-E-Mail</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companyData.companyEmail}
                  onChange={(e) => setCompanyData({ ...companyData, companyEmail: e.target.value })}
                  placeholder="info@meinefirma.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefon</Label>
                <Input
                  id="companyPhone"
                  value={companyData.companyPhone}
                  onChange={(e) => setCompanyData({ ...companyData, companyPhone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Zurueck
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Weiter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Setup abschliessen</h3>
                  <p className="text-sm text-muted-foreground">Ueberpruefen Sie Ihre Angaben</p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Administrator:</span>
                  <span className="font-medium">{adminData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-Mail:</span>
                  <span className="font-medium">{adminData.email}</span>
                </div>
                {companyData.companyName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firma:</span>
                    <span className="font-medium">{companyData.companyName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Zurueck
                </Button>
                <Button onClick={handleSetup} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird eingerichtet...
                    </>
                  ) : (
                    'Setup abschliessen'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Setup abgeschlossen!</h3>
              <p className="text-muted-foreground mb-4">
                Ihr CRM-System ist bereit. Sie werden jetzt zur Anmeldung weitergeleitet...
              </p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
