'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Calendar, 
  Euro, 
  Check, 
  X, 
  Box, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Key,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type DashboardStats = {
  totalItems: number
  availableItems: number
  rentedItems: number
  activeBookings: number
  pendingBookings: number
  revenueThisMonth: number
  revenueLastMonth: number
}

type RecentBooking = {
  id: string
  bookingNumber: string
  startDate: string
  endDate: string
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  item: {
    name: string
    category: {
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

type UpcomingReturn = {
  id: string
  bookingNumber: string
  endDate: string
  item: {
    name: string
  }
  customer: {
    firstName: string
    lastName: string
  }
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Ausstehend', variant: 'secondary' },
  CONFIRMED: { label: 'Bestaetigt', variant: 'default' },
  ACTIVE: { label: 'Aktiv', variant: 'default' },
  COMPLETED: { label: 'Abgeschlossen', variant: 'outline' },
  CANCELLED: { label: 'Storniert', variant: 'destructive' },
}

export default function RentalDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    availableItems: 0,
    rentedItems: 0,
    activeBookings: 0,
    pendingBookings: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [upcomingReturns, setUpcomingReturns] = useState<UpcomingReturn[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [itemsRes, bookingsRes] = await Promise.all([
        fetch('/api/rental/items?isActive=true&limit=100'),
        fetch('/api/rental/bookings?limit=50'),
      ])

      let items: { isAvailable: boolean }[] = []
      let bookings: RecentBooking[] = []

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        items = data.items || []
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        bookings = data.bookings || []
      }

      // Calculate stats
      const totalItems = items.length
      const availableItems = items.filter(i => i.isAvailable).length
      const rentedItems = items.filter(i => !i.isAvailable).length
      const activeBookings = bookings.filter(b => b.status === 'ACTIVE' || b.status === 'CONFIRMED').length
      const pendingBookings = bookings.filter(b => b.status === 'PENDING').length

      // Calculate revenue (simplified - based on completed bookings)
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      setStats({
        totalItems,
        availableItems,
        rentedItems,
        activeBookings,
        pendingBookings,
        revenueThisMonth: 0, // Would need totalPrice from bookings
        revenueLastMonth: 0,
      })

      // Recent bookings (last 5)
      setRecentBookings(bookings.slice(0, 5))

      // Upcoming returns (active bookings ending soon)
      const upcoming = bookings
        .filter(b => b.status === 'ACTIVE' && new Date(b.endDate) > new Date())
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .slice(0, 5)
      setUpcomingReturns(upcoming)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Heute'
    if (diff === 1) return 'Morgen'
    return `In ${diff} Tagen`
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
          <h1 className="text-3xl font-bold tracking-tight">Vermietung Dashboard</h1>
          <p className="text-muted-foreground">Uebersicht ueber alle Vermietungen und Buchungen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/rental/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Kalender
            </Link>
          </Button>
          <Button asChild>
            <Link href="/rental/bookings">
              <Plus className="mr-2 h-4 w-4" />
              Neue Buchung
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Objekte</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Mietobjekte im System</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verfuegbar</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.availableItems}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Frei zur Vermietung</span>
              {stats.totalItems > 0 && (
                <span className="text-green-600">
                  ({Math.round((stats.availableItems / stats.totalItems) * 100)}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vermietet</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rentedItems}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Aktuell belegt</span>
              {stats.totalItems > 0 && (
                <span className="text-red-600">
                  ({Math.round((stats.rentedItems / stats.totalItems) * 100)}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Buchungen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingBookings > 0 && (
                <span className="text-yellow-600">{stats.pendingBookings} ausstehend</span>
              )}
              {stats.pendingBookings === 0 && 'Laufende Vermietungen'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors">
          <Link href="/rental/bookings" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Buchungen verwalten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Alle Buchungen anzeigen und neue erstellen
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link href="/rental/items" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-5 w-5 text-primary" />
                Objekte verwalten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Mietobjekte und deren Verfuegbarkeit
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors">
          <Link href="/rental/calendar" className="block">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Kalender oeffnen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Vermietungen im Kalender anzeigen
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Letzte Buchungen</CardTitle>
              <CardDescription>Die neuesten Buchungen im System</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/rental/bookings">
                Alle anzeigen
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Buchungen vorhanden
              </p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{booking.item.name}</span>
                        <Badge
                          variant={statusLabels[booking.status]?.variant || 'outline'}
                          className="text-xs"
                        >
                          {statusLabels[booking.status]?.label || booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.customer.companyName || 
                          `${booking.customer.firstName} ${booking.customer.lastName}`}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{formatDate(booking.startDate)}</div>
                      <div className="text-xs">bis {formatDate(booking.endDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Returns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Anstehende Rueckgaben</CardTitle>
              <CardDescription>Bald endende Vermietungen</CardDescription>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingReturns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Keine anstehenden Rueckgaben
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingReturns.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <span className="font-medium">{booking.item.name}</span>
                      <p className="text-sm text-muted-foreground">
                        {booking.customer.firstName} {booking.customer.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          new Date(booking.endDate).getTime() - new Date().getTime() < 86400000
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {getDaysUntil(booking.endDate)}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(booking.endDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
