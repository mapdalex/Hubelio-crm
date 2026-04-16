'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Eye, Check, X, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

type RentalItem = {
  id: string
  name: string
  isAvailable: boolean
  category: {
    id: string
    name: string
    color: string
  }
}

type Customer = {
  id: string
  customerNumber: string
  firstName: string
  lastName: string
  companyName: string | null
  email: string | null
}

type RentalBooking = {
  id: string
  bookingNumber: string
  startDate: string
  endDate: string
  totalPrice: number | null
  currency: string
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  createdAt: string
  item: {
    id: string
    name: string
    category: {
      id: string
      name: string
      color: string
    }
  }
  customer: {
    id: string
    firstName: string
    lastName: string
    companyName: string | null
    email: string | null
    phone: string | null
  }
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Check }> = {
  PENDING: { label: 'Ausstehend', variant: 'secondary', icon: Clock },
  CONFIRMED: { label: 'Bestaetigt', variant: 'default', icon: Check },
  ACTIVE: { label: 'Aktiv', variant: 'default', icon: Check },
  COMPLETED: { label: 'Abgeschlossen', variant: 'outline', icon: Check },
  CANCELLED: { label: 'Storniert', variant: 'destructive', icon: X },
}

export default function RentalBookingsPage() {
  const [items, setItems] = useState<RentalItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bookings, setBookings] = useState<RentalBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<RentalBooking | null>(null)

  const [bookingForm, setBookingForm] = useState({
    itemId: '',
    customerId: '',
    startDate: '',
    endDate: '',
    notes: '',
    createCalendarEvent: true,
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [itemsRes, customersRes, bookingsRes] = await Promise.all([
        fetch('/api/rental/items?isActive=true&limit=200'),
        fetch('/api/customers?limit=500'),
        fetch('/api/rental/bookings?limit=200'),
      ])

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
      }
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
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

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      search === '' ||
      booking.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
      booking.item.name.toLowerCase().includes(search.toLowerCase()) ||
      booking.customer.firstName.toLowerCase().includes(search.toLowerCase()) ||
      booking.customer.lastName.toLowerCase().includes(search.toLowerCase()) ||
      booking.customer.companyName?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingForm.itemId || !bookingForm.customerId || !bookingForm.startDate || !bookingForm.endDate) {
      alert('Bitte alle Pflichtfelder ausfuellen')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/rental/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        resetForm()
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Fehler beim Erstellen der Buchung')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/rental/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        loadData()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating booking:', error)
    }
  }

  const resetForm = () => {
    setBookingForm({
      itemId: '',
      customerId: '',
      startDate: '',
      endDate: '',
      notes: '',
      createCalendarEvent: true,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buchungen</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Vermietungsbuchungen</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Buchung
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateBooking}>
              <DialogHeader>
                <DialogTitle>Neue Buchung erstellen</DialogTitle>
                <DialogDescription>
                  Waehlen Sie ein Mietobjekt und einen Kunden fuer die Buchung
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="booking-item">Mietobjekt *</Label>
                  <Select
                    value={bookingForm.itemId}
                    onValueChange={(val) => setBookingForm({ ...bookingForm, itemId: val })}
                  >
                    <SelectTrigger id="booking-item">
                      <SelectValue placeholder="Mietobjekt waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {items
                        .filter((i) => i.isAvailable)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: item.category.color }}
                              />
                              {item.name} ({item.category.name})
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="booking-customer">Kunde *</Label>
                  <Select
                    value={bookingForm.customerId}
                    onValueChange={(val) => setBookingForm({ ...bookingForm, customerId: val })}
                  >
                    <SelectTrigger id="booking-customer">
                      <SelectValue placeholder="Kunde waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.companyName || `${customer.firstName} ${customer.lastName}`} (
                          {customer.customerNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="booking-start">Von *</Label>
                    <Input
                      id="booking-start"
                      type="date"
                      value={bookingForm.startDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="booking-end">Bis *</Label>
                    <Input
                      id="booking-end"
                      type="date"
                      value={bookingForm.endDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="booking-notes">Notizen</Label>
                  <Textarea
                    id="booking-notes"
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="Optionale Notizen zur Buchung"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="booking-calendar"
                    checked={bookingForm.createCalendarEvent}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, createCalendarEvent: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="booking-calendar" className="text-sm font-normal">
                    Kalendereintrag erstellen
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  Buchung erstellen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Buchungsnummer, Objekt oder Kunde..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="PENDING">Ausstehend</SelectItem>
            <SelectItem value="CONFIRMED">Bestaetigt</SelectItem>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
            <SelectItem value="CANCELLED">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Keine Buchungen gefunden</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Erste Buchung erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buchungsnr.</TableHead>
                <TableHead>Mietobjekt</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => {
                const StatusIcon = statusConfig[booking.status]?.icon || Clock
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">
                      {booking.bookingNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: booking.item.category.color }}
                        />
                        <span>{booking.item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {booking.item.category.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        {booking.customer.companyName ||
                          `${booking.customer.firstName} ${booking.customer.lastName}`}
                      </div>
                      {booking.customer.email && (
                        <span className="text-xs text-muted-foreground">
                          {booking.customer.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(booking.startDate)}</div>
                      <div className="text-xs text-muted-foreground">
                        bis {formatDate(booking.endDate)}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(booking.totalPrice, booking.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[booking.status]?.variant || 'outline'}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig[booking.status]?.label || booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {booking.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}>
                              <Check className="mr-2 h-4 w-4" />
                              Bestaetigen
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'ACTIVE')}>
                              <Check className="mr-2 h-4 w-4" />
                              Als Aktiv markieren
                            </DropdownMenuItem>
                          )}
                          {booking.status === 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'COMPLETED')}>
                              <Check className="mr-2 h-4 w-4" />
                              Abschliessen
                            </DropdownMenuItem>
                          )}
                          {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Stornieren
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buchungsdetails</DialogTitle>
            <DialogDescription>
              Buchungsnummer: {selectedBooking?.bookingNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mietobjekt</Label>
                  <p className="font-medium">{selectedBooking.item.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.item.category.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge 
                    variant={statusConfig[selectedBooking.status]?.variant || 'outline'}
                    className="mt-1"
                  >
                    {statusConfig[selectedBooking.status]?.label || selectedBooking.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Kunde</Label>
                <p className="font-medium">
                  {selectedBooking.customer.companyName ||
                    `${selectedBooking.customer.firstName} ${selectedBooking.customer.lastName}`}
                </p>
                {selectedBooking.customer.email && (
                  <p className="text-sm text-muted-foreground">{selectedBooking.customer.email}</p>
                )}
                {selectedBooking.customer.phone && (
                  <p className="text-sm text-muted-foreground">{selectedBooking.customer.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Von</Label>
                  <p className="font-medium">{formatDate(selectedBooking.startDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bis</Label>
                  <p className="font-medium">{formatDate(selectedBooking.endDate)}</p>
                </div>
              </div>

              {selectedBooking.totalPrice && (
                <div>
                  <Label className="text-muted-foreground">Gesamtpreis</Label>
                  <p className="text-lg font-semibold">
                    {formatPrice(selectedBooking.totalPrice, selectedBooking.currency)}
                  </p>
                </div>
              )}

              {selectedBooking.notes && (
                <div>
                  <Label className="text-muted-foreground">Notizen</Label>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>
              Schliessen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
