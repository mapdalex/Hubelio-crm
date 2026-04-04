'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Ticket, MessageSquare, Clock, User } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'

type TicketItem = {
  id: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  createdAt: string
  customer: {
    id: string
    customerNumber: string
    company: string | null
    firstName: string
    lastName: string
  } | null
  assignedTo: {
    id: string
    name: string
  } | null
  computer: {
    id: string
    name: string
  } | null
  _count: {
    comments: number
  }
}

const statusLabels: Record<string, string> = {
  OPEN: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  WAITING: 'Wartend',
  RESOLVED: 'Geloest',
  CLOSED: 'Geschlossen',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export default function TicketsClient() {
  const searchParams = useSearchParams()
  const { user, companyRole, isSuperAdmin } = useAuth()
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Check if user can manage tickets (company members or superadmin)
  const isEmployee = isSuperAdmin() || (companyRole && ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(companyRole))
  
  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
        priority: priorityFilter,
      })
      const res = await fetch(`/api/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadTickets])
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default'
      case 'IN_PROGRESS': return 'secondary'
      case 'WAITING': return 'outline'
      case 'RESOLVED': return 'default'
      case 'CLOSED': return 'secondary'
      default: return 'outline'
    }
  }
  
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            {isEmployee ? 'Verwalten Sie Support-Anfragen' : 'Ihre Support-Anfragen'}
          </p>
        </div>
        <Button asChild>
          <Link href={`/tickets/new${searchParams.get('customer') ? `?customer=${searchParams.get('customer')}` : ''}`}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Ticket
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ticket suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="OPEN">Offen</SelectItem>
                <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                <SelectItem value="WAITING">Wartend</SelectItem>
                <SelectItem value="RESOLVED">Geloest</SelectItem>
                <SelectItem value="CLOSED">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioritaet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritaeten</SelectItem>
                <SelectItem value="URGENT">Dringend</SelectItem>
                <SelectItem value="HIGH">Hoch</SelectItem>
                <SelectItem value="MEDIUM">Mittel</SelectItem>
                <SelectItem value="LOW">Niedrig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Tickets gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Erstellen Sie Ihr erstes Ticket'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    {isEmployee && <TableHead>Kunde</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritaet</TableHead>
                    {isEmployee && <TableHead>Zugewiesen</TableHead>}
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-center">Kommentare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                          <div className="font-medium">{ticket.ticketNumber}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {ticket.subject}
                          </div>
                          {ticket.computer && (
                            <div className="text-xs text-muted-foreground">
                              PC: {ticket.computer.name}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      {isEmployee && (
                        <TableCell>
                          {ticket.customer ? (
                            <Link href={`/customers/${ticket.customer.id}`} className="hover:underline">
                              {ticket.customer.company || `${ticket.customer.firstName} ${ticket.customer.lastName}`}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getStatusVariant(ticket.status)}>
                          {statusLabels[ticket.status] || ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(ticket.priority)}>
                          {priorityLabels[ticket.priority] || ticket.priority}
                        </Badge>
                      </TableCell>
                      {isEmployee && (
                        <TableCell>
                          {ticket.assignedTo ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{ticket.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Nicht zugewiesen</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ticket.createdAt), 'dd.MM.yy HH:mm', { locale: de })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{ticket._count.comments}</span>
                        </div>
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
