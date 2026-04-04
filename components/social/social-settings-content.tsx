'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Plus, Loader2, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PlatformIcon, getPlatformName } from '@/components/social/platform-icon'

type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN'

type SocialAccount = {
  id: string
  platform: SocialPlatform
  accountName: string
  accountId: string
  profileUrl: string | null
  profileImage: string | null
  isActive: boolean
  tokenExpires: string | null
  createdAt: string
  updatedAt: string
}

const platforms: { id: SocialPlatform; name: string; description: string }[] = [
  {
    id: 'INSTAGRAM',
    name: 'Instagram',
    description: 'Posts, Reels, Stories veroeffentlichen',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    description: 'Beitraege und Videos veroeffentlichen',
  },
  {
    id: 'TIKTOK',
    name: 'TikTok',
    description: 'Videos und Reels veroeffentlichen',
  },
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    description: 'Professionelle Beitraege veroeffentlichen',
  },
]

export function SocialSettingsContent() {
  const { companyId, companyRole } = useAuth()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<SocialAccount | null>(null)

  const canManage = ['ADMIN', 'MANAGER', 'OWNER'].includes(companyRole || '')
  const canDelete = ['ADMIN', 'OWNER'].includes(companyRole || '')

  useEffect(() => {
    loadAccounts()
  }, [companyId])

  useEffect(() => {
    // Handle OAuth callback messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'connected') {
      toast.success('Account erfolgreich verbunden')
      loadAccounts()
      // Clear URL params
      window.history.replaceState({}, '', '/settings/social')
    } else if (error) {
      toast.error(`Verbindung fehlgeschlagen: ${error}`)
      window.history.replaceState({}, '', '/settings/social')
    }
  }, [searchParams])

  const loadAccounts = async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/accounts`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading social accounts:', error)
      toast.error('Fehler beim Laden der Accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (platform: SocialPlatform) => {
    if (!companyId) return

    setConnectingPlatform(platform)
    try {
      const res = await fetch(`/api/social/oauth/${platform.toLowerCase()}?companyId=${companyId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'OAuth Fehler')
      }

      // Redirect to OAuth provider
      window.location.href = data.authUrl
    } catch (error) {
      console.error('OAuth error:', error)
      toast.error(error instanceof Error ? error.message : 'Verbindung fehlgeschlagen')
      setConnectingPlatform(null)
    }
  }

  const handleToggleActive = async (account: SocialAccount) => {
    if (!companyId) return

    try {
      const res = await fetch(`/api/social/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      })

      if (res.ok) {
        setAccounts(accounts.map(a => 
          a.id === account.id ? { ...a, isActive: !a.isActive } : a
        ))
        toast.success(account.isActive ? 'Account deaktiviert' : 'Account aktiviert')
      } else {
        throw new Error('Fehler beim Aktualisieren')
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Accounts')
    }
  }

  const handleDelete = async () => {
    if (!companyId || !deleteAccount) return

    try {
      const res = await fetch(`/api/social/accounts/${deleteAccount.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== deleteAccount.id))
        toast.success('Account entfernt')
      } else {
        throw new Error('Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen des Accounts')
    } finally {
      setDeleteAccount(null)
    }
  }

  const getConnectedAccount = (platform: SocialPlatform) => {
    return accounts.find(a => a.platform === platform)
  }

  const isTokenExpired = (account: SocialAccount) => {
    if (!account.tokenExpires) return false
    return new Date(account.tokenExpires) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">
            Verbinde Social Media Accounts um Inhalte zu veroeffentlichen
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Platform Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {platforms.map((platform) => {
              const account = getConnectedAccount(platform.id)
              const expired = account ? isTokenExpired(account) : false

              return (
                <Card key={platform.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platform={platform.id} className="h-8 w-8" />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {platform.name}
                            {account && (
                              <Badge variant={account.isActive ? 'default' : 'secondary'}>
                                {account.isActive ? 'Verbunden' : 'Inaktiv'}
                              </Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive">Token abgelaufen</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{platform.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {account ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {account.profileImage && (
                            <img src={account.profileImage} alt="" className="h-10 w-10 rounded-full" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">@{account.accountName}</p>
                            {account.profileUrl && (
                              <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
                                Profil anzeigen
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {canManage && (
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={() => handleToggleActive(account)}
                            />
                          )}
                        </div>

                        {account.tokenExpires && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {expired ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <span>
                              Token {expired ? 'abgelaufen' : 'gueltig bis'}:{' '}
                              {new Date(account.tokenExpires).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {(expired || !account.isActive) && canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(platform.id)}
                              disabled={connectingPlatform === platform.id}
                            >
                              {connectingPlatform === platform.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                              )}
                              Neu verbinden
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteAccount(account)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Entfernen
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnect(platform.id)}
                        disabled={!canManage || connectingPlatform === platform.id}
                        className="w-full"
                      >
                        {connectingPlatform === platform.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        {platform.name} verbinden
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Hinweis zur Einrichtung</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Um Social Media Accounts zu verbinden, muessen die entsprechenden API-Schluessel 
                in den Umgebungsvariablen konfiguriert sein:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Instagram/Facebook: META_APP_ID, META_APP_SECRET</li>
                <li>TikTok: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET</li>
                <li>LinkedIn: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET</li>
              </ul>
            </CardContent>
          </Card>

          {!canManage && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardHeader>
                <CardTitle className="text-yellow-600">Eingeschraenkte Rechte</CardTitle>
              </CardHeader>
              <CardContent>
                Sie benoetigen Manager- oder Admin-Rechte um Social Media Accounts zu verwalten.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Account &quot;@{deleteAccount?.accountName}&quot; wird entfernt. 
              Geplante Posts fuer diesen Account werden nicht mehr veroeffentlicht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
