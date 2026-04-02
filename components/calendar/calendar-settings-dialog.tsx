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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Trash2 } from 'lucide-react'

interface CalendarItem {
  id: string
  name: string
  description?: string | null
  color: string
  type: string
  isDefault: boolean
  isOwner: boolean
}

interface CalendarSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar?: CalendarItem | null
  onSave: (calendar: Partial<CalendarItem>) => Promise<void>
  onDelete?: (calendarId: string) => Promise<void>
}

const colorOptions = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
]

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  calendar,
  onSave,
  onDelete,
}: CalendarSettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')

  useEffect(() => {
    if (calendar) {
      setName(calendar.name)
      setDescription(calendar.description || '')
      setColor(calendar.color)
    } else {
      setName('')
      setDescription('')
      setColor('#3b82f6')
    }
  }, [calendar, open])

  const handleSave = async () => {
    if (!name.trim()) return

    setLoading(true)
    try {
      await onSave({
        id: calendar?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!calendar?.id || !onDelete) return

    setDeleteLoading(true)
    try {
      await onDelete(calendar.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Fehler beim Loeschen:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const canDelete = calendar && !calendar.isDefault && calendar.isOwner && onDelete

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {calendar ? 'Kalender bearbeiten' : 'Neuer Kalender'}
          </DialogTitle>
          <DialogDescription>
            {calendar 
              ? 'Bearbeiten Sie die Kalendereinstellungen'
              : 'Erstellen Sie einen neuen persoenlichen Kalender'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kalendername eingeben..."
            />
          </div>

          {/* Farbe */}
          <div className="grid gap-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-8 rounded-full transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          <div className="grid gap-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung eingeben..."
              rows={3}
            />
          </div>

          {/* Typ Info */}
          {calendar && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Typ:</span>{' '}
                {calendar.type === 'PERSONAL' && 'Persoenlicher Kalender'}
                {calendar.type === 'COMPANY' && 'Firmenkalender'}
                {calendar.type === 'VACATION' && 'Urlaubskalender'}
                {calendar.type === 'SHARED' && 'Geteilter Kalender'}
              </p>
              {calendar.isDefault && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Dies ist ein Standard-Kalender und kann nicht geloescht werden.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {canDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span className="ml-2">Loeschen</span>
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
