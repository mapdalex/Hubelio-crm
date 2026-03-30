'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Building2, User, MoreHorizontal, Phone, Mail, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'

type Customer = {
  id: string
  customerNumber: string
  companyName: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  city: string | null
  isActive: boolean
  _count: {
    contacts: number
    computers: number
    tickets: number
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sortBy, setSortBy] = useState('customerNumber')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
      })
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
      }
      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCustomers(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, sortBy, sortOrder])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadCustomers])
  
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      company: formData.get('company'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      mobile: formData.get('mobile'),
      street: formData.get('street'),
      zipCode: formData.get('zipCode'),
      city: formData.get('city'),
      notes: formData.get('notes'),
    }
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setIsCreateOpen(false)
        loadCustomers()
      }
    } catch (error) {
      console.error('Error creating customer:', error)
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kunden</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Kunden und Kontakte</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Kunde
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Neuen Kunden anlegen</DialogTitle>
                <DialogDescription>
                  Geben Sie die Kundendaten ein. Die Kundennummer wird automatisch vergeben.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Firma</Label>
                  <Input id="company" name="company" placeholder="Firmenname (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" name="phone" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile">Mobil</Label>
                  <Input id="mobile" name="mobile" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="street">Strasse</Label>
                  <Input id="street" name="street" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">PLZ</Label>
                    <Input id="zipCode" name="zipCode" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Stadt</Label>
                    <Input id="city" name="city" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                  Kunde anlegen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, Nummer, Stadt..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v: 'all' | 'active' | 'inactive') => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy('customerNumber'); setSortOrder('asc') }}>
                    Kundennummer (aufst.)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('customerNumber'); setSortOrder('desc') }}>
                    Kundennummer (abst.)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('lastName'); setSortOrder('asc') }}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('lastName'); setSortOrder('desc') }}>
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('desc') }}>
                    Neueste zuerst
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('asc') }}>
                    Aelteste zuerst
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {totalCustomers} Kunden
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Kunden gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihren ersten Kunden an'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Stadt</TableHead>
                    <TableHead className="text-center">Kontakte</TableHead>
                    <TableHead className="text-center">PCs</TableHead>
                    <TableHead className="text-center">Tickets</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 hover:underline">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {customer.companyName ? (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer.customerNumber}
                              {customer.companyName && ` - ${customer.firstName} ${customer.lastName}`}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.city || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{customer._count.contacts}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{customer._count.computers}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{customer._count.tickets}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/customers/${customer.id}`}>Details anzeigen</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/tickets/new?customer=${customer.id}`}>Ticket erstellen</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Zurueck
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Seite {page} von {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Weiter
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
