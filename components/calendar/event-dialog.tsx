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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Loader2, Trash2, MapPin, Calendar, Clock, Users, Tag } from 'lucide-react'

interface CalendarItem {
  id: string
  name: string
  color: string
  type: string
  canEdit: boolean
}

interface CalendarEvent {
  id?: string
  title: string
  description?: string
  location?: string
  eventType: string
  startDate: string
  endDate: string
  allDay: boolean
  color?: string
  calendarId: string
  attendees?: Array<{
    user: { id: string; name: string; email: string }
    status: string
  }>
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  calendars: CalendarItem[]
  defaultDate?: Date
  onSave: (event: Partial<CalendarEvent>) => Promise<void>
  onDelete?: (eventId: string) => Promise<void>
}

const eventTypes = [
  { value: 'EVENT', label: 'Termin' },
  { value: 'MEETING', label: 'Besprechung' },
  { value: 'VACATION', label: 'Urlaub' },
  { value: 'REMINDER', label: 'Erinnerung' },
  { value: 'TASK', label: 'Aufgabe' },
  { value: 'BIRTHDAY', label: 'Geburtstag' },
  { value: 'HOLIDAY', label: 'Feiertag' },
  { value: 'RENTAL', label: 'Vermietung' },
  { value: 'RENTAL_CLEANING', label: 'Reinigung' },
]

export function EventDialog({
  open,
  onOpenChange,
  event,
  calendars,
  defaultDate,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState('EVENT')
  const [calendarId, setCalendarId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)

  // Initialisiere Formular
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setLocation(event.location || '')
      setEventType(event.eventType)
      setCalendarId(event.calendarId)
      setAllDay(event.allDay)
      
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      setStartDate(format(start, 'yyyy-MM-dd'))
      setStartTime(format(start, 'HH:mm'))
      setEndDate(format(end, 'yyyy-MM-dd'))
      setEndTime(format(end, 'HH:mm'))
    } else {
      // Neue Event-Defaults
      const date = defaultDate || new Date()
      setTitle('')
      setDescription('')
      setLocation('')
      setEventType('EVENT')
      setCalendarId(calendars.find(c => c.type === 'PERSONAL')?.id || calendars[0]?.id || '')
      setAllDay(false)
      setStartDate(format(date, 'yyyy-MM-dd'))
      setStartTime(format(date, 'HH:mm'))
      setEndDate(format(date, 'yyyy-MM-dd'))
      
      // End-Zeit 1 Stunde spaeter
      const endHour = new Date(date)
      endHour.setHours(endHour.getHours() + 1)
      setEndTime(format(endHour, 'HH:mm'))
    }
  }, [event, defaultDate, calendars, open])

  const handleSave = async () => {
    if (!title.trim() || !calendarId) return

    setLoading(true)
    try {
      const startDateTime = allDay 
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}:00`)
      
      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59`)
        : new Date(`${endDate}T${endTime}:00`)

      await onSave({
        id: event?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        eventType,
        calendarId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        allDay,
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return

    setDeleteLoading(true)
    try {
      await onDelete(event.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Fehler beim Loeschen:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const editableCalendars = calendars.filter(c => c.canEdit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {event?.id ? 'Termin bearbeiten' : 'Neuer Termin'}
          </DialogTitle>
          <DialogDescription>
            {event?.id 
              ? 'Bearbeiten Sie die Details des Termins'
              : 'Erstellen Sie einen neuen Termin'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Titel */}
          <div className="grid gap-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel eingeben..."
            />
          </div>

          {/* Kalender & Typ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="size-4" />
                Kalender
              </Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kalender waehlen" />
                </SelectTrigger>
                <SelectContent>
                  {editableCalendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: cal.color }}
                        />
                        {cal.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Tag className="size-4" />
                Typ
              </Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ganztaegig */}
          <div className="flex items-center gap-2">
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label htmlFor="allDay">Ganztaegig</Label>
          </div>

          {/* Datum & Zeit */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Clock className="size-4" />
                  Start
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1"
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-24"
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Ende</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1"
                  />
                  {!allDay && (
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-24"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ort */}
          <div className="grid gap-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="size-4" />
              Ort
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ort eingeben..."
            />
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
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {event?.id && onDelete && (
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
            <Button onClick={handleSave} disabled={loading || !title.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {event?.id ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
