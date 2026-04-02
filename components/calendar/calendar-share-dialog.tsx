'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, Trash2, UserPlus, Search } from 'lucide-react'
import useSWR from 'swr'

interface CalendarShare {
  id: string
  userId: string
  canEdit: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface CalendarItem {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface CalendarShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar: CalendarItem | null
  onAddShare: (calendarId: string, userId: string, canEdit: boolean) => Promise<void>
  onRemoveShare: (calendarId: string, userId: string) => Promise<void>
  onUpdateShare: (calendarId: string, userId: string, canEdit: boolean) => Promise<void>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function CalendarShareDialog({
  open,
  onOpenChange,
  calendar,
  onAddShare,
  onRemoveShare,
  onUpdateShare,
}: CalendarShareDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  // Lade aktuelle Freigaben
  const { data: shares, mutate: mutateShares } = useSWR<CalendarShare[]>(
    calendar && open ? `/api/calendars/${calendar.id}/share` : null,
    fetcher
  )

  // Lade User fuer Suche
  const { data: searchResults } = useSWR<User[]>(
    searchQuery.length >= 2 ? `/api/users/search?q=${encodeURIComponent(searchQuery)}` : null,
    fetcher
  )

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  const handleAddShare = async (user: User) => {
    if (!calendar) return

    setLoading(user.id)
    try {
      await onAddShare(calendar.id, user.id, false)
      await mutateShares()
      setSearchQuery('')
    } catch (error) {
      console.error('Fehler beim Hinzufuegen:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleToggleEdit = async (share: CalendarShare) => {
    if (!calendar) return

    setLoading(share.userId)
    try {
      await onUpdateShare(calendar.id, share.userId, !share.canEdit)
      await mutateShares()
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleRemoveShare = async (share: CalendarShare) => {
    if (!calendar) return

    setLoading(share.userId)
    try {
      await onRemoveShare(calendar.id, share.userId)
      await mutateShares()
    } catch (error) {
      console.error('Fehler beim Entfernen:', error)
    } finally {
      setLoading(null)
    }
  }

  // Filtere bereits freigegebene User aus Suchergebnissen
  const filteredSearchResults = searchResults?.filter(
    user => !shares?.some(share => share.userId === user.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kalender freigeben</DialogTitle>
          <DialogDescription>
            Teilen Sie &quot;{calendar?.name}&quot; mit anderen Teammitgliedern
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Suche */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Person hinzufuegen
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name oder E-Mail suchen..."
                className="pl-9"
              />
            </div>

            {/* Suchergebnisse */}
            {filteredSearchResults && filteredSearchResults.length > 0 && (
              <div className="rounded-lg border bg-card">
                {filteredSearchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddShare(user)}
                      disabled={loading === user.id}
                    >
                      {loading === user.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Hinzufuegen'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && filteredSearchResults?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Keine Personen gefunden
              </p>
            )}
          </div>

          {/* Aktuelle Freigaben */}
          {shares && shares.length > 0 && (
            <div className="grid gap-2">
              <Label>Freigegeben an</Label>
              <div className="rounded-lg border divide-y">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback>
                          {share.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{share.user.name}</p>
                        <p className="text-xs text-muted-foreground">{share.user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={share.canEdit}
                          onCheckedChange={() => handleToggleEdit(share)}
                          disabled={loading === share.userId}
                        />
                        <span className="text-xs text-muted-foreground">
                          {share.canEdit ? 'Bearbeiten' : 'Nur lesen'}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveShare(share)}
                        disabled={loading === share.userId}
                        className="text-destructive hover:text-destructive"
                      >
                        {loading === share.userId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shares?.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <UserPlus className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Dieser Kalender ist noch mit niemandem geteilt
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schliessen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
