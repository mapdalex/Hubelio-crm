'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, User, Phone, Mail, Building2, ArrowUpDown, MoreHorizontal, Users } from 'lucide-react'
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
import { Spinner } from '@/components/ui/spinner'

type Contact = {
  id: string
  firstName: string
  lastName: string
  position: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  isPrimary: boolean
  customer: {
    id: string
    customerNumber: string
    companyName: string | null
    firstName: string
    lastName: string
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [sortBy, setSortBy] = useState('lastName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const loadContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
      })
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalContacts(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, sortBy, sortOrder])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadContacts])
  
  const getCustomerDisplayName = (customer: Contact['customer']) => {
    if (customer.companyName) {
      return customer.companyName
    }
    return `${customer.firstName} ${customer.lastName}`
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kontakte</h1>
          <p className="text-muted-foreground">Alle Ansprechpartner Ihrer Kunden</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Name, E-Mail, Firma..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy('lastName'); setSortOrder('asc') }}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('lastName'); setSortOrder('desc') }}>
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('customerName'); setSortOrder('asc') }}>
                    Kunde (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('customerName'); setSortOrder('desc') }}>
                    Kunde (Z-A)
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
                {totalContacts} Kontakte
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Kontakte gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Es wurden noch keine Kontakte angelegt'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Kontaktdaten</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                            {contact.isPrimary && (
                              <Badge variant="secondary" className="text-xs">Hauptkontakt</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/customers/${contact.customer.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{getCustomerDisplayName(contact.customer)}</div>
                            <div className="text-sm text-muted-foreground">{contact.customer.customerNumber}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {contact.position || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {contact.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                            </div>
                          )}
                          {contact.mobile && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${contact.mobile}`} className="hover:underline">{contact.mobile} (Mobil)</a>
                            </div>
                          )}
                          {!contact.email && !contact.phone && !contact.mobile && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
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
                              <Link href={`/customers/${contact.customer.id}`}>Kunde anzeigen</Link>
                            </DropdownMenuItem>
                            {contact.email && (
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${contact.email}`}>E-Mail senden</a>
                              </DropdownMenuItem>
                            )}
                            {contact.phone && (
                              <DropdownMenuItem asChild>
                                <a href={`tel:${contact.phone}`}>Anrufen</a>
                              </DropdownMenuItem>
                            )}
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
