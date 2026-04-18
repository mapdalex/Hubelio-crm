'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type RentalCategory = {
  id: string
  name: string
  color: string
}

type RentalItem = {
  id: string
  name: string
  category: {
    id: string
    name: string
    color: string
  }
}

type RentalBooking = {
  id: string
  bookingNumber: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  item: {
    id: string
    name: string
    cleaningDays?: number | null
    category: {
      id: string
      name: string
      color: string
    }
  }
  customer: {
    firstName: string
    lastName: string
    companyName: string | null
  }
}

type CalendarDayEntry = {
  id: string
  type: 'booking' | 'cleaning'
  label: string
  bookingNumber?: string
  status?: string
  startDate: string
  endDate: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-blue-500',
  ACTIVE: 'bg-green-500',
  COMPLETED: 'bg-gray-400',
  CANCELLED: 'bg-red-500',
  CLEANING: 'bg-amber-400',
}

const MONTHS = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function RentalCalendarPage() {
  const [categories, setCategories] = useState<RentalCategory[]>([])
  const [items, setItems] = useState<RentalItem[]>([])
  const [bookings, setBookings] = useState<RentalBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<string>('all')
  const [currentDate, setCurrentDate] = useState(new Date())

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categoriesRes, itemsRes, bookingsRes] = await Promise.all([
        fetch('/api/rental/categories?isActive=true'),
        fetch('/api/rental/items?isActive=true&limit=200'),
        fetch('/api/rental/bookings?limit=500'),
      ])

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return items
    return items.filter(item => item.category.id === selectedCategory)
  }, [items, selectedCategory])

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // Exclude cancelled bookings
      if (booking.status === 'CANCELLED') return false
      
      // Filter by category
      if (selectedCategory !== 'all' && booking.item.category.id !== selectedCategory) {
        return false
      }
      
      // Filter by item
      if (selectedItem !== 'all' && booking.item.id !== selectedItem) {
        return false
      }
      
      return true
    })
  }, [bookings, selectedCategory, selectedItem])

  // Calendar helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  // Convert Sunday = 0 to Monday = 0
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get all entries (bookings + cleaning blocks) for a specific day
  const getEntriesForDay = (day: number): CalendarDayEntry[] => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    const entries: CalendarDayEntry[] = []

    filteredBookings.forEach(booking => {
      const start = new Date(booking.startDate).toISOString().split('T')[0]
      const end = new Date(booking.endDate).toISOString().split('T')[0]

      if (dateStr >= start && dateStr <= end) {
        entries.push({
          id: booking.id,
          type: 'booking',
          label: booking.item.name,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
        })
      }

      // Compute recurring cleaning entries - every X days during the booking period
      if (booking.item.cleaningDays && booking.item.cleaningDays > 0) {
        const bookingStart = new Date(booking.startDate)
        const bookingEnd = new Date(booking.endDate)
        const interval = booking.item.cleaningDays

        // Start from X days after booking start, repeat every X days until booking end
        const cleaningDate = new Date(bookingStart)
        cleaningDate.setDate(cleaningDate.getDate() + interval)

        let cleaningIndex = 0
        while (cleaningDate <= bookingEnd) {
          const cleaningDateStr = cleaningDate.toISOString().split('T')[0]

          if (dateStr === cleaningDateStr) {
            entries.push({
              id: `cleaning-${booking.id}-${cleaningIndex}`,
              type: 'cleaning',
              label: `Reinigung: ${booking.item.name}`,
              startDate: cleaningDate.toISOString(),
              endDate: cleaningDate.toISOString(),
            })
          }

          // Move to next cleaning date
          cleaningDate.setDate(cleaningDate.getDate() + interval)
          cleaningIndex++
        }
      }
    })

    return entries
  }

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vermietungskalender</h1>
          <p className="text-muted-foreground">Uebersicht aller Buchungen im Kalender</p>
        </div>
        <Button asChild>
          <Link href="/rental/bookings">
            <Plus className="mr-2 h-4 w-4" />
            Neue Buchung
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Select value={selectedCategory} onValueChange={(val) => {
          setSelectedCategory(val)
          setSelectedItem('all')
        }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedItem} onValueChange={setSelectedItem}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Mietobjekt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Objekte</SelectItem>
            {filteredItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
        </div>
        <h2 className="text-xl font-semibold">
          {MONTHS[month]} {year}
        </h2>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-r p-2 text-center text-sm font-medium last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-b border-r bg-muted/30 p-1"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEntries = getEntriesForDay(day)
              const today = isToday(day)

              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[100px] border-b border-r p-1',
                    today && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm',
                      today && 'bg-primary text-primary-foreground font-medium'
                    )}
                  >
                    {day}
                  </div>

                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-xs text-white',
                          entry.type === 'cleaning'
                            ? statusColors['CLEANING']
                            : statusColors[entry.status ?? '']
                        )}
                        title={entry.label}
                      >
                        {entry.label}
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEntries.length - 3} weitere
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Legende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-yellow-500" />
              <span className="text-sm">Ausstehend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span className="text-sm">Bestaetigt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span className="text-sm">Aktiv</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-gray-400" />
              <span className="text-sm">Abgeschlossen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-amber-400" />
              <span className="text-sm">Reinigung</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
