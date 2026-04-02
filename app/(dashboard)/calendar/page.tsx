'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { CalendarSidebar } from '@/components/calendar/calendar-sidebar'
import { CalendarView } from '@/components/calendar/calendar-view'
import { EventDialog } from '@/components/calendar/event-dialog'
import { CalendarSettingsDialog } from '@/components/calendar/calendar-settings-dialog'
import { CalendarShareDialog } from '@/components/calendar/calendar-share-dialog'
import { Loader2 } from 'lucide-react'
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface CalendarItem {
  id: string
  name: string
  description?: string | null
  color: string
  type: 'PERSONAL' | 'COMPANY' | 'VACATION' | 'SHARED'
  isDefault: boolean
  isVisible: boolean
  isOwner: boolean
  canEdit: boolean
  owner?: {
    id: string
    name: string
  } | null
}

interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  description?: string
  location?: string
  eventType: string
  startDate: string
  endDate: string
  allDay: boolean
  effectiveColor: string
  color?: string
  calendar: {
    id: string
    name: string
    color: string
    type: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  attendees?: Array<{
    user: { id: string; name: string; email: string }
    status: string
  }>
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [dateRange, setDateRange] = useState(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(addMonths(new Date(), 1))
  }))

  // Dialogs
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>()
  
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarItem | null>(null)
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false)

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareCalendar, setShareCalendar] = useState<CalendarItem | null>(null)

  // Initialisiere Kalender beim ersten Laden
  useEffect(() => {
    fetch('/api/calendars/init', { method: 'POST' })
      .then(() => mutate('/api/calendars'))
      .catch(console.error)
  }, [])

  // Lade Kalender
  const { data: calendars = [], isLoading: calendarsLoading } = useSWR<CalendarItem[]>(
    '/api/calendars',
    fetcher
  )

  // Lade Events
  const eventsUrl = `/api/calendar-events?start=${format(dateRange.start, 'yyyy-MM-dd')}&end=${format(dateRange.end, 'yyyy-MM-dd')}`
  const { data: events = [], isLoading: eventsLoading } = useSWR<CalendarEvent[]>(
    eventsUrl,
    fetcher
  )

  // Filtere Events nach sichtbaren Kalendern
  const visibleCalendarIds = calendars.filter(c => c.isVisible).map(c => c.id)
  const visibleEvents = events.filter(e => visibleCalendarIds.includes(e.calendarId))

  // Kalender-Sichtbarkeit aendern
  const handleToggleVisibility = async (calendarId: string, isVisible: boolean) => {
    try {
      await fetch(`/api/calendars/${calendarId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible })
      })
      mutate('/api/calendars')
    } catch (error) {
      console.error('Fehler beim Aendern der Sichtbarkeit:', error)
    }
  }

  // Event-Aktionen
  const handleCreateEvent = (date: Date) => {
    setSelectedEvent(null)
    setDefaultEventDate(date)
    setEventDialogOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDefaultEventDate(undefined)
    setEventDialogOpen(true)
  }

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (eventData.id) {
        await fetch(`/api/calendar-events/${eventData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
      } else {
        await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })
      }
      mutate(eventsUrl)
    } catch (error) {
      console.error('Fehler beim Speichern des Events:', error)
      throw error
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/calendar-events/${eventId}`, {
        method: 'DELETE'
      })
      mutate(eventsUrl)
    } catch (error) {
      console.error('Fehler beim Loeschen des Events:', error)
      throw error
    }
  }

  // Kalender-Aktionen
  const handleCreateCalendar = () => {
    setSelectedCalendar(null)
    setIsCreatingCalendar(true)
    setSettingsDialogOpen(true)
  }

  const handleEditCalendar = (calendar: CalendarItem) => {
    setSelectedCalendar(calendar)
    setIsCreatingCalendar(false)
    setSettingsDialogOpen(true)
  }

  const handleSaveCalendar = async (calendarData: Partial<CalendarItem>) => {
    try {
      if (calendarData.id) {
        await fetch(`/api/calendars/${calendarData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calendarData)
        })
      } else {
        await fetch('/api/calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...calendarData, type: 'PERSONAL' })
        })
      }
      mutate('/api/calendars')
    } catch (error) {
      console.error('Fehler beim Speichern des Kalenders:', error)
      throw error
    }
  }

  const handleDeleteCalendar = async (calendarId: string) => {
    try {
      await fetch(`/api/calendars/${calendarId}`, {
        method: 'DELETE'
      })
      mutate('/api/calendars')
      mutate(eventsUrl)
    } catch (error) {
      console.error('Fehler beim Loeschen des Kalenders:', error)
      throw error
    }
  }

  // Share-Aktionen
  const handleShareCalendar = (calendar: CalendarItem) => {
    setShareCalendar(calendar)
    setShareDialogOpen(true)
  }

  const handleAddShare = async (calendarId: string, userId: string, canEdit: boolean) => {
    await fetch(`/api/calendars/${calendarId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, canEdit })
    })
  }

  const handleRemoveShare = async (calendarId: string, userId: string) => {
    await fetch(`/api/calendars/${calendarId}/share?userId=${userId}`, {
      method: 'DELETE'
    })
  }

  const handleUpdateShare = async (calendarId: string, userId: string, canEdit: boolean) => {
    await fetch(`/api/calendars/${calendarId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, canEdit })
    })
  }

  // Datum-Aenderung -> Range aktualisieren
  useEffect(() => {
    setDateRange({
      start: startOfMonth(addMonths(selectedDate, -1)),
      end: endOfMonth(addMonths(selectedDate, 2))
    })
  }, [selectedDate])

  if (calendarsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <CalendarSidebar
        calendars={calendars}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onToggleVisibility={handleToggleVisibility}
        onCreateCalendar={handleCreateCalendar}
        onEditCalendar={handleEditCalendar}
        onShareCalendar={handleShareCalendar}
      />

      {/* Hauptkalender */}
      <CalendarView
        events={visibleEvents}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
        view={view}
        onViewChange={setView}
      />

      {/* Event Dialog */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        calendars={calendars}
        defaultDate={defaultEventDate}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Kalender Einstellungen Dialog */}
      <CalendarSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        calendar={isCreatingCalendar ? null : selectedCalendar}
        onSave={handleSaveCalendar}
        onDelete={handleDeleteCalendar}
      />

      {/* Kalender Share Dialog */}
      <CalendarShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        calendar={shareCalendar}
        onAddShare={handleAddShare}
        onRemoveShare={handleRemoveShare}
        onUpdateShare={handleUpdateShare}
      />
    </div>
  )
}
