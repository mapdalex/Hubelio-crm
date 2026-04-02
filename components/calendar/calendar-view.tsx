'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
} from 'date-fns'
import { de } from 'date-fns/locale'

interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  allDay: boolean
  effectiveColor: string
  calendar: {
    id: string
    name: string
    type: string
  }
  eventType: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date) => void
  view: 'month' | 'week' | 'day'
  onViewChange: (view: 'month' | 'week' | 'day') => void
}

export function CalendarView({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onCreateEvent,
  view,
  onViewChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Navigation
  const navigatePrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subDays(currentDate, 1))
    }
  }

  const navigateNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    onDateSelect(new Date())
  }

  // Tage fuer Monatsansicht
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Tage fuer Wochenansicht
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Events fuer einen Tag
  const getEventsForDay = (date: Date) => {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    
    return events.filter(event => {
      const eventStart = parseISO(event.startDate)
      const eventEnd = parseISO(event.endDate)
      return eventStart <= dayEnd && eventEnd >= dayStart
    })
  }

  // Header Titel
  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: de })
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'd. MMM', { locale: de })} - ${format(end, 'd. MMM yyyy', { locale: de })}`
    } else {
      return format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })
    }
  }, [currentDate, view])

  // Stunden fuer Tag-/Wochenansicht
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{headerTitle}</h2>
        </div>

        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Monat
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Woche
          </Button>
          <Button
            variant={view === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('day')}
          >
            Tag
          </Button>
        </div>
      </div>

      {/* Kalender-Content */}
      <div className="flex-1 overflow-auto">
        {view === 'month' && (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            selectedDate={selectedDate}
            events={events}
            getEventsForDay={getEventsForDay}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
          />
        )}

        {view === 'week' && (
          <WeekView
            days={weekDays}
            hours={hours}
            events={events}
            getEventsForDay={getEventsForDay}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
          />
        )}

        {view === 'day' && (
          <DayView
            date={currentDate}
            hours={hours}
            events={getEventsForDay(currentDate)}
            onEventClick={onEventClick}
            onCreateEvent={onCreateEvent}
          />
        )}
      </div>
    </div>
  )
}

// Monatsansicht
function MonthView({
  days,
  currentDate,
  selectedDate,
  getEventsForDay,
  onDateSelect,
  onEventClick,
  onCreateEvent,
}: {
  days: Date[]
  currentDate: Date
  selectedDate: Date
  events: CalendarEvent[]
  getEventsForDay: (date: Date) => CalendarEvent[]
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date) => void
}) {
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="flex h-full flex-col">
      {/* Wochentage Header */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="border-r px-2 py-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Tage Grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)

          return (
            <div
              key={idx}
              className={cn(
                'group relative flex min-h-24 flex-col border-b border-r p-1 transition-colors last:border-r-0',
                !isCurrentMonth && 'bg-muted/30',
                'hover:bg-accent/50 cursor-pointer'
              )}
              onClick={() => {
                onDateSelect(day)
                if (dayEvents.length === 0) {
                  onCreateEvent(day)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm',
                    !isCurrentMonth && 'text-muted-foreground',
                    isTodayDate && 'bg-primary text-primary-foreground',
                    isSelected && !isTodayDate && 'bg-accent'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    className="truncate rounded px-1 py-0.5 text-left text-xs text-white"
                    style={{ backgroundColor: event.effectiveColor }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-xs text-muted-foreground">
                    +{dayEvents.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Wochenansicht
function WeekView({
  days,
  hours,
  getEventsForDay,
  onDateSelect,
  onEventClick,
  onCreateEvent,
}: {
  days: Date[]
  hours: number[]
  events: CalendarEvent[]
  getEventsForDay: (date: Date) => CalendarEvent[]
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date) => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header mit Tagen */}
      <div className="flex border-b">
        <div className="w-16 shrink-0" />
        {days.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'flex-1 border-r px-2 py-2 text-center last:border-r-0',
              isToday(day) && 'bg-primary/10'
            )}
          >
            <div className="text-xs text-muted-foreground">
              {format(day, 'EEE', { locale: de })}
            </div>
            <div
              className={cn(
                'text-lg font-semibold',
                isToday(day) && 'text-primary'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Zeitraster */}
      <div className="flex flex-1 overflow-auto">
        {/* Stunden-Spalte */}
        <div className="w-16 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex h-12 items-start justify-end border-b pr-2 text-xs text-muted-foreground"
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Tage */}
        {days.map((day, dayIdx) => {
          const dayEvents = getEventsForDay(day)
          
          return (
            <div key={dayIdx} className="relative flex-1 border-r last:border-r-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-12 border-b hover:bg-accent/30 cursor-pointer"
                  onClick={() => {
                    const eventDate = new Date(day)
                    eventDate.setHours(hour)
                    onCreateEvent(eventDate)
                  }}
                />
              ))}

              {/* Events */}
              {dayEvents.map((event) => {
                const start = parseISO(event.startDate)
                const end = parseISO(event.endDate)
                const startHour = start.getHours() + start.getMinutes() / 60
                const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                
                return (
                  <button
                    key={event.id}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 py-0.5 text-left text-xs text-white"
                    style={{
                      backgroundColor: event.effectiveColor,
                      top: `${startHour * 48}px`,
                      height: `${Math.max(duration * 48, 20)}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    {duration >= 1 && (
                      <div className="truncate opacity-80">
                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Tagesansicht
function DayView({
  date,
  hours,
  events,
  onEventClick,
  onCreateEvent,
}: {
  date: Date
  hours: number[]
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date) => void
}) {
  return (
    <div className="flex h-full">
      {/* Stunden-Spalte */}
      <div className="w-20 shrink-0">
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex h-16 items-start justify-end border-b pr-2 text-sm text-muted-foreground"
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Tag */}
      <div className="relative flex-1 border-l">
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-16 border-b hover:bg-accent/30 cursor-pointer"
            onClick={() => {
              const eventDate = new Date(date)
              eventDate.setHours(hour)
              onCreateEvent(eventDate)
            }}
          />
        ))}

        {/* Events */}
        {events.map((event) => {
          const start = parseISO(event.startDate)
          const end = parseISO(event.endDate)
          const startHour = start.getHours() + start.getMinutes() / 60
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          
          return (
            <button
              key={event.id}
              className="absolute left-1 right-4 overflow-hidden rounded-lg px-3 py-2 text-left text-white shadow-sm"
              style={{
                backgroundColor: event.effectiveColor,
                top: `${startHour * 64}px`,
                height: `${Math.max(duration * 64, 32)}px`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(event)
              }}
            >
              <div className="font-semibold">{event.title}</div>
              <div className="text-sm opacity-80">
                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
              </div>
              {event.calendar && (
                <div className="mt-1 text-xs opacity-70">
                  {event.calendar.name}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
