'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Search, User, Filter, Download, Trash2 } from 'lucide-react'
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
import { format, formatDuration, intervalToDuration } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'

type WorkTimeItem = {
  id: string
  type: 'WORK' | 'HOME_OFFICE' | 'DOCTOR_VISIT'
  startTime: string
  endTime: string | null
  duration: number | null
  notes: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

const typeLabels: Record<string, string> = {
  WORK: 'Arbeitszeit',
  HOME_OFFICE: 'Homeoffice',
  DOCTOR_VISIT: 'Arztbesuch',
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'WORK': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'HOME_OFFICE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'DOCTOR_VISIT': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const formatDurationMinutes = (minutes: number | null) => {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function WorkTimeClient() {
  const { user, companyRole } = useAuth()
  const [workTimes, setWorkTimes] = useState<WorkTimeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'own' | 'all'>('own')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || 
    companyRole === 'MANAGER' || companyRole === 'OWNER' || companyRole === 'ADMIN'

  const loadWorkTimes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (view === 'all') {
        // Don't add userId filter for managers viewing all
      }
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      
      if (startDate) {
        params.append('startDate', startDate)
      }
      
      if (endDate) {
        params.append('endDate', endDate)
      }

      const res = await fetch(`/api/worktime?${params}`)
      const data = await res.json()
      
      // Filter by search term locally
      let filtered = data
      if (search) {
        filtered = data.filter((item: WorkTimeItem) =>
          item.user.name.toLowerCase().includes(search.toLowerCase()) ||
          item.user.email.toLowerCase().includes(search.toLowerCase())
        )
      }

      setWorkTimes(filtered)
    } catch (error) {
      console.error('Error loading work times:', error)
    } finally {
      setIsLoading(false)
    }
  }, [view, typeFilter, startDate, endDate, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkTimes()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadWorkTimes])

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      return
    }

    setIsDeleting(id)
    try {
      const res = await fetch(`/api/worktime/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setWorkTimes(workTimes.filter(w => w.id !== id))
      } else {
        alert('Fehler beim Löschen des Eintrags')
      }
    } catch (error) {
      console.error('Error deleting work time:', error)
      alert('Fehler beim Löschen des Eintrags')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Mitarbeiter', 'Email', 'Typ', 'Startzeit', 'Endzeit', 'Dauer', 'Notizen'].join(','),
      ...workTimes.map(w => [
        w.user.name,
        w.user.email,
        typeLabels[w.type],
        format(new Date(w.startTime), 'dd.MM.yyyy HH:mm', { locale: de }),
        w.endTime ? format(new Date(w.endTime), 'dd.MM.yyyy HH:mm', { locale: de }) : '-',
        w.duration ? formatDurationMinutes(w.duration) : '-',
        w.notes || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arbeitszeiten-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arbeitszeit</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Arbeitszeiten und Homeoffice-Eintraege
          </p>
        </div>
        {isManager && workTimes.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportieren
          </Button>
        )}
      </div>

      {isManager && (
        <Tabs value={view} onValueChange={(v) => setView(v as 'own' | 'all')}>
          <TabsList>
            <TabsTrigger value="own">Meine Eintraege</TabsTrigger>
            <TabsTrigger value="all">Alle Eintraege</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nach Mitarbeiter suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="WORK">Arbeitszeit</SelectItem>
                <SelectItem value="HOME_OFFICE">Homeoffice</SelectItem>
                <SelectItem value="DOCTOR_VISIT">Arztbesuch</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Startdatum"
              className="w-[150px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Enddatum"
              className="w-[150px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : workTimes.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Eintraege gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Starten Sie Ihre erste Arbeitszeit mit dem Button oben rechts'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {view === 'all' && <TableHead>Mitarbeiter</TableHead>}
                      <TableHead>Typ</TableHead>
                      <TableHead>Startzeit</TableHead>
                      <TableHead>Endzeit</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Notizen</TableHead>
                      <TableHead className="w-[50px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workTimes.map((wt) => (
                      <TableRow key={wt.id}>
                        {view === 'all' && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{wt.user.name}</div>
                                <div className="text-xs text-muted-foreground">{wt.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(wt.type)}`}>
                            {typeLabels[wt.type]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(wt.startTime), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {wt.endTime 
                              ? format(new Date(wt.endTime), 'dd.MM.yyyy HH:mm', { locale: de })
                              : <Badge variant="secondary">Läuft</Badge>
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {formatDurationMinutes(wt.duration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {wt.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(wt.user.id === user?.id || isManager) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(wt.id)}
                              disabled={isDeleting === wt.id}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {workTimes.length} Einträge gefunden
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
