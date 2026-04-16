'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Calendar, MapPin, Euro, Home, Wrench, Car, Box, Eye, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { cn } from '@/lib/utils'

type RentalCategory = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string
  _count: {
    items: number
  }
}

type RentalItem = {
  id: string
  name: string
  description: string | null
  location: string | null
  image: string | null
  pricePerHour: number | null
  pricePerDay: number | null
  pricePerWeek: number | null
  pricePerMonth: number | null
  currency: string
  features: string[]
  isActive: boolean
  isAvailable: boolean
  category: {
    id: string
    name: string
    color: string
    icon: string | null
  }
  _count: {
    bookings: number
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
  item: {
    id: string
    name: string
    image: string | null
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

function getIconComponent(iconName: string | null) {
  switch (iconName) {
    case 'home':
      return Home
    case 'wrench':
      return Wrench
    case 'car':
      return Car
    case 'box':
    default:
      return Box
  }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ausstehend', color: 'bg-yellow-500' },
  CONFIRMED: { label: 'Bestaetigt', color: 'bg-blue-500' },
  ACTIVE: { label: 'Aktiv', color: 'bg-green-500' },
  COMPLETED: { label: 'Abgeschlossen', color: 'bg-gray-500' },
  CANCELLED: { label: 'Storniert', color: 'bg-red-500' },
}

export default function RentalPage() {
  const [categories, setCategories] = useState<RentalCategory[]>([])
  const [items, setItems] = useState<RentalItem[]>([])
  const [bookings, setBookings] = useState<RentalBooking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null)
  const [activeTab, setActiveTab] = useState('items')

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
      const [categoriesRes, itemsRes, bookingsRes, customersRes] = await Promise.all([
        fetch('/api/rental/categories?isActive=true'),
        fetch('/api/rental/items?isActive=true&limit=100'),
        fetch('/api/rental/bookings?limit=50'),
        fetch('/api/customers?limit=200'),
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
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Error loading rental data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category.id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Stats
  const totalItems = items.length
  const availableItems = items.filter((i) => i.isAvailable).length
  const rentedItems = items.filter((i) => !i.isAvailable).length
  const activeBookings = bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED').length

  // Handle booking
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
        setIsBookingDialogOpen(false)
        setBookingForm({
          itemId: '',
          customerId: '',
          startDate: '',
          endDate: '',
          notes: '',
          createCalendarEvent: true,
        })
        setSelectedItem(null)
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

  const openBookingDialog = (item: RentalItem) => {
    setSelectedItem(item)
    setBookingForm({
      ...bookingForm,
      itemId: item.id,
    })
    setIsBookingDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vermietung</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mietobjekte und Buchungen</p>
        </div>
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSelectedItem(null)
                setBookingForm({
                  itemId: '',
                  customerId: '',
                  startDate: '',
                  endDate: '',
                  notes: '',
                  createCalendarEvent: true,
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neue Buchung
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreateBooking}>
              <DialogHeader>
                <DialogTitle>Neue Buchung erstellen</DialogTitle>
                <DialogDescription>
                  {selectedItem
                    ? `Buchung fuer "${selectedItem.name}"`
                    : 'Waehlen Sie ein Mietobjekt und einen Kunden'}
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
                            {item.name} ({item.category.name})
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  Buchung erstellen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Mietobjekte</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verfuegbar</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableItems}</div>
            <p className="text-xs text-muted-foreground">Frei zur Vermietung</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vermietet</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rentedItems}</div>
            <p className="text-xs text-muted-foreground">Aktuell belegt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Buchungen</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBookings}</div>
            <p className="text-xs text-muted-foreground">Aktive Buchungen</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Mietobjekte</TabsTrigger>
            <TabsTrigger value="bookings">Buchungen</TabsTrigger>
          </TabsList>

          {/* Mietobjekte Tab */}
          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Keine Mietobjekte gefunden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                  const Icon = getIconComponent(item.category.icon)
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        'relative overflow-hidden transition-shadow hover:shadow-md',
                        !item.isAvailable && 'opacity-75'
                      )}
                    >
                      {/* Availability indicator */}
                      <div
                        className={cn(
                          'absolute right-3 top-3 h-3 w-3 rounded-full',
                          item.isAvailable ? 'bg-green-500' : 'bg-red-500'
                        )}
                        title={item.isAvailable ? 'Verfuegbar' : 'Vermietet'}
                      />

                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${item.category.color}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: item.category.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{item.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className="mt-1"
                              style={{ borderColor: item.category.color, color: item.category.color }}
                            >
                              {item.category.name}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2 pb-3">
                        {item.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {item.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                        {item.pricePerDay && (
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Euro className="h-3 w-3" />
                            <span>
                              {Number(item.pricePerDay).toFixed(2)} {item.currency}/Tag
                            </span>
                          </div>
                        )}
                        {item.features.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.features.slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {f}
                              </Badge>
                            ))}
                            {item.features.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.features.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="gap-2 pt-0">
                        <Button
                          size="sm"
                          variant={item.isAvailable ? 'default' : 'secondary'}
                          className="flex-1"
                          disabled={!item.isAvailable}
                          onClick={() => openBookingDialog(item)}
                        >
                          {item.isAvailable ? (
                            <>
                              <Calendar className="mr-2 h-4 w-4" />
                              Buchen
                            </>
                          ) : (
                            <>
                              <Clock className="mr-2 h-4 w-4" />
                              Belegt
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Buchungen Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Buchungen</CardTitle>
                <CardDescription>Uebersicht aller Vermietungen</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">Keine Buchungen vorhanden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buchungsnr.</TableHead>
                        <TableHead>Mietobjekt</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Zeitraum</TableHead>
                        <TableHead>Preis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => {
                        const statusInfo = statusLabels[booking.status]
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-mono text-sm">
                              {booking.bookingNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: booking.item.category.color,
                                    color: booking.item.category.color,
                                  }}
                                >
                                  {booking.item.category.name}
                                </Badge>
                                <span className="font-medium">{booking.item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {booking.customer.companyName ||
                                    `${booking.customer.firstName} ${booking.customer.lastName}`}
                                </div>
                                {booking.customer.email && (
                                  <div className="text-sm text-muted-foreground">
                                    {booking.customer.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{new Date(booking.startDate).toLocaleDateString('de-DE')}</div>
                                <div className="text-muted-foreground">
                                  bis {new Date(booking.endDate).toLocaleDateString('de-DE')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {booking.totalPrice ? (
                                <span className="font-medium">
                                  {Number(booking.totalPrice).toFixed(2)} {booking.currency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-white', statusInfo.color)}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={booking.status}
                                onValueChange={(val) => handleStatusChange(booking.id, val)}
                              >
                                <SelectTrigger className="h-8 w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Ausstehend</SelectItem>
                                  <SelectItem value="CONFIRMED">Bestaetigt</SelectItem>
                                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                                  <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
                                  <SelectItem value="CANCELLED">Storniert</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
