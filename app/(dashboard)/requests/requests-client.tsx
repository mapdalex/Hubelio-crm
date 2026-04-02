'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, Clock, User, Check, X, Filter } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'

type RequestItem = {
  id: string
  requestNumber: string
  type: string
  status: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  approvedAt: string | null
  approvalComment: string | null
  requester: {
    id: string
    name: string
    email: string
  }
  approvedBy: {
    id: string
    name: string
  } | null
  calendarEvent: {
    id: string
    title: string
    startDate: string
    endDate: string
  } | null
}

const typeLabels: Record<string, string> = {
  VACATION: 'Urlaub',
  SPECIAL_LEAVE: 'Sonderurlaub',
  MEETING: 'Meeting',
  HOME_OFFICE: 'Home Office',
  BUSINESS_TRIP: 'Dienstreise',
  TRAINING: 'Weiterbildung',
  OTHER: 'Sonstiges',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Ausstehend',
  APPROVED: 'Genehmigt',
  REJECTED: 'Abgelehnt',
  CANCELLED: 'Storniert',
}

export default function RequestsClient() {
  const { user, companyRole } = useAuth()
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'own' | 'all'>('own')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || 
    companyRole === 'MANAGER' || companyRole === 'OWNER' || companyRole === 'ADMIN'

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
        type: typeFilter,
        view,
      })
      const res = await fetch(`/api/requests?${params}`)
      const data = await res.json()
      setRequests(data.requests || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, typeFilter, view])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadRequests])

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary'
      case 'APPROVED': return 'default'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'outline'
      default: return 'outline'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VACATION': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      case 'SPECIAL_LEAVE': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
      case 'MEETING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'HOME_OFFICE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'BUSINESS_TRIP': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'TRAINING': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return '-'
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, 'dd.MM.yyyy', { locale: de })
    }
    
    return `${format(startDate, 'dd.MM.', { locale: de })} - ${format(endDate, 'dd.MM.yyyy', { locale: de })}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Antraege</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Urlaubs-, Meeting- und andere Antraege
          </p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Antrag
          </Link>
        </Button>
      </div>

      {isManager && (
        <Tabs value={view} onValueChange={(v) => { setView(v as 'own' | 'all'); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="own">Meine Antraege</TabsTrigger>
            <TabsTrigger value="all">Alle Antraege</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Antrag suchen..."
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
                <SelectItem value="PENDING">Ausstehend</SelectItem>
                <SelectItem value="APPROVED">Genehmigt</SelectItem>
                <SelectItem value="REJECTED">Abgelehnt</SelectItem>
                <SelectItem value="CANCELLED">Storniert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="VACATION">Urlaub</SelectItem>
                <SelectItem value="SPECIAL_LEAVE">Sonderurlaub</SelectItem>
                <SelectItem value="MEETING">Meeting</SelectItem>
                <SelectItem value="HOME_OFFICE">Home Office</SelectItem>
                <SelectItem value="BUSINESS_TRIP">Dienstreise</SelectItem>
                <SelectItem value="TRAINING">Weiterbildung</SelectItem>
                <SelectItem value="OTHER">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Antraege gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Erstellen Sie Ihren ersten Antrag'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Antrag</TableHead>
                    <TableHead>Typ</TableHead>
                    {view === 'all' && <TableHead>Antragsteller</TableHead>}
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Bearbeitet von</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Link href={`/requests/${req.id}`} className="hover:underline">
                          <div className="font-medium">{req.requestNumber}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {req.title}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(req.type)}`}>
                          {typeLabels[req.type] || req.type}
                        </span>
                      </TableCell>
                      {view === 'all' && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{req.requester.name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm">
                          {formatDateRange(req.startDate, req.endDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(req.status)}>
                          {req.status === 'APPROVED' && <Check className="mr-1 h-3 w-3" />}
                          {req.status === 'REJECTED' && <X className="mr-1 h-3 w-3" />}
                          {statusLabels[req.status] || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(req.createdAt), 'dd.MM.yy', { locale: de })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.approvedBy ? (
                          <span className="text-sm">{req.approvedBy.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
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
