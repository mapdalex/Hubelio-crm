'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, Settings, Users, Building2, Plane, User, Key, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarItem {
  id: string
  name: string
  color: string
  type: 'PERSONAL' | 'COMPANY' | 'VACATION' | 'SHARED' | 'RENTAL' | 'RENTAL_CLEANING'
  isVisible: boolean
  isOwner: boolean
  canEdit: boolean
  owner?: {
    id: string
    name: string
  } | null
}

interface CalendarSidebarProps {
  calendars: CalendarItem[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onToggleVisibility: (calendarId: string, isVisible: boolean) => void
  onCreateCalendar: () => void
  onEditCalendar: (calendar: CalendarItem) => void
  onShareCalendar: (calendar: CalendarItem) => void
}

const typeIcons = {
  PERSONAL: User,
  COMPANY: Building2,
  VACATION: Plane,
  SHARED: Users,
  RENTAL: Key,
  RENTAL_CLEANING: Sparkles,
}

const typeLabels = {
  PERSONAL: 'Persoenlich',
  COMPANY: 'Firma',
  VACATION: 'Urlaub',
  SHARED: 'Geteilt',
  RENTAL: 'Vermietung',
  RENTAL_CLEANING: 'Reinigung',
}

export function CalendarSidebar({
  calendars,
  selectedDate,
  onDateSelect,
  onToggleVisibility,
  onCreateCalendar,
  onEditCalendar,
  onShareCalendar,
}: CalendarSidebarProps) {
  const [hoveredCalendar, setHoveredCalendar] = useState<string | null>(null)

  // Gruppiere Kalender nach Typ
  const groupedCalendars = {
    PERSONAL: calendars.filter(c => c.type === 'PERSONAL'),
    COMPANY: calendars.filter(c => c.type === 'COMPANY'),
    VACATION: calendars.filter(c => c.type === 'VACATION'),
    SHARED: calendars.filter(c => c.type === 'SHARED'),
    RENTAL: calendars.filter(c => c.type === 'RENTAL'),
    RENTAL_CLEANING: calendars.filter(c => c.type === 'RENTAL_CLEANING'),
  }

  return (
    <div className="flex w-64 flex-col gap-4 border-r bg-card p-4">
      {/* Mini-Kalender */}
      <div className="rounded-lg border bg-background p-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          className="w-full"
        />
      </div>

      {/* Neuer Kalender Button */}
      <Button onClick={onCreateCalendar} className="w-full gap-2">
        <Plus className="size-4" />
        Neuer Kalender
      </Button>

      {/* Kalender-Liste */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {Object.entries(groupedCalendars).map(([type, typeCalendars]) => {
          if (typeCalendars.length === 0) return null
          const Icon = typeIcons[type as keyof typeof typeIcons]
          
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                <Icon className="size-3" />
                {typeLabels[type as keyof typeof typeLabels]}
              </div>
              
              <div className="space-y-1">
                {typeCalendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                      'hover:bg-accent'
                    )}
                    onMouseEnter={() => setHoveredCalendar(calendar.id)}
                    onMouseLeave={() => setHoveredCalendar(null)}
                  >
                    <Checkbox
                      checked={calendar.isVisible}
                      onCheckedChange={(checked) => 
                        onToggleVisibility(calendar.id, checked as boolean)
                      }
                      style={{
                        borderColor: calendar.color,
                        backgroundColor: calendar.isVisible ? calendar.color : 'transparent'
                      }}
                      className="border-2 data-[state=checked]:border-transparent"
                    />
                    
                    <span className="flex-1 truncate text-sm">
                      {calendar.name}
                    </span>

                    {/* Aktions-Buttons */}
                    <div className={cn(
                      'flex gap-1 transition-opacity',
                      hoveredCalendar === calendar.id ? 'opacity-100' : 'opacity-0'
                    )}>
                      {calendar.isOwner && calendar.type === 'PERSONAL' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => onShareCalendar(calendar)}
                        >
                          <Users className="size-3" />
                        </Button>
                      )}
                      {calendar.canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => onEditCalendar(calendar)}
                        >
                          <Settings className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
