'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, Download, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

type WorkTimeItem = {
  id: string
  type: string
  startTime: string
  endTime: string | null
  duration: number | null
  notes: string | null
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

const typeBadgeColors: Record<string, string> = {
  WORK: 'bg-blue-100 text-blue-800',
  HOME_OFFICE: 'bg-green-100 text-green-800',
  DOCTOR_VISIT: 'bg-orange-100 text-orange-800',
}

export function WorktimeClient() {
  const { user, companyRole } = useAuth()
  const [workTimes, setWorkTimes] = useState<WorkTimeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || 
    companyRole === 'MANAGER' || companyRole === 'OWNER' || companyRole === 'ADMIN'

  const loadWorkTimes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      
      const response = await fetch(`/api/worktime?${params}`)
      if (!response.ok) throw new Error('Fehler beim Laden')
      
      const data = await response.json()
      setWorkTimes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading work times:', error)
      setWorkTimes([])
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    loadWorkTimes()
  }, [loadWorkTimes])

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    
    try {
      const response = await fetch(`/api/worktime/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Fehler beim Löschen')
      
      setWorkTimes(workTimes.filter(w => w.id !== id))
    } catch (error) {
      console.error('Error deleting work time:', error)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Datum', 'Benutzer', 'Typ', 'Start', 'Ende', 'Dauer (Min)', 'Notizen'].join(','),
      ...workTimes.map(w => [
        format(new Date(w.startTime), 'dd.MM.yyyy', { locale: de }),
        w.user.name,
        typeLabels[w.type] || w.type,
        format(new Date(w.startTime), 'HH:mm', { locale: de }),
        w.endTime ? format(new Date(w.endTime), 'HH:mm', { locale: de }) : '-',
        w.duration || '-',
        w.notes || '',
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arbeitszeiten_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const filteredWorkTimes = workTimes.filter(w =>
    !search || 
    w.user.name.toLowerCase().includes(search.toLowerCase()) ||
    w.user.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arbeitszeiten</h1>
          <p className="text-sm text-muted-foreground">Übersicht und Verwaltung aller Arbeitszeiten</p>
        </div>
        {isManager && (
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Einträge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nach Name oder E-Mail suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="WORK">Arbeitszeit</SelectItem>
                <SelectItem value="HOME_OFFICE">Homeoffice</SelectItem>
                <SelectItem value="DOCTOR_VISIT">Arztbesuch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : filteredWorkTimes.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Keine Einträge gefunden
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Ende</TableHead>
                    <TableHead>Dauer</TableHead>
                    {!isManager && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkTimes.map(w => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{w.user.name}</p>
                          <p className="text-xs text-muted-foreground">{w.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeBadgeColors[w.type] || ''}>
                          {typeLabels[w.type] || w.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(w.startTime), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </TableCell>
                      <TableCell>
                        {w.endTime
                          ? format(new Date(w.endTime), 'dd.MM.yyyy HH:mm', { locale: de })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {w.duration ? `${w.duration} min` : '-'}
                      </TableCell>
                      {!isManager && (
                        <TableCell>
                          <button
                            onClick={() => handleDelete(w.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
