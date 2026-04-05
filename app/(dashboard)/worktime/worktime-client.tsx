'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Trash2, Download, Clock, FileText, Calendar } from 'lucide-react'
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
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

export function WorktimeClient() {
  const { user, companyRole } = useAuth()
  const [workTimes, setWorkTimes] = useState<WorkTimeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))

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

  // Calculate monthly statistics
  const monthlyStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const monthlyWorkTimes = filteredWorkTimes.filter(w => {
      const startDate = new Date(w.startTime)
      return isWithinInterval(startDate, { start: monthStart, end: monthEnd })
    })

    const totalMinutes = monthlyWorkTimes.reduce((sum, w) => sum + (w.duration || 0), 0)
    const workMinutes = monthlyWorkTimes
      .filter(w => w.type === 'WORK')
      .reduce((sum, w) => sum + (w.duration || 0), 0)
    const homeOfficeMinutes = monthlyWorkTimes
      .filter(w => w.type === 'HOME_OFFICE')
      .reduce((sum, w) => sum + (w.duration || 0), 0)
    const doctorMinutes = monthlyWorkTimes
      .filter(w => w.type === 'DOCTOR_VISIT')
      .reduce((sum, w) => sum + (w.duration || 0), 0)

    return {
      total: totalMinutes,
      work: workMinutes,
      homeOffice: homeOfficeMinutes,
      doctor: doctorMinutes,
      entries: monthlyWorkTimes.length,
    }
  }, [filteredWorkTimes, selectedMonth])

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: de }),
      })
    }
    return options
  }, [])

  // PDF Export function
  const handlePdfExport = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const monthlyWorkTimes = filteredWorkTimes.filter(w => {
      const startDate = new Date(w.startTime)
      return isWithinInterval(startDate, { start: monthStart, end: monthEnd })
    })

    const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: de })

    // Create PDF content as HTML for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Arbeitszeiten ${monthName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
          .stat-card { background: #f5f5f5; padding: 15px; border-radius: 8px; min-width: 150px; }
          .stat-label { font-size: 12px; color: #666; }
          .stat-value { font-size: 20px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .badge-work { background: #dbeafe; color: #1e40af; }
          .badge-home { background: #dcfce7; color: #166534; }
          .badge-doctor { background: #ffedd5; color: #9a3412; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Arbeitszeiten - ${monthName}</h1>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Gesamtzeit</div>
            <div class="stat-value">${formatDuration(monthlyStats.total)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Arbeitszeit</div>
            <div class="stat-value">${formatDuration(monthlyStats.work)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Homeoffice</div>
            <div class="stat-value">${formatDuration(monthlyStats.homeOffice)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Arztbesuche</div>
            <div class="stat-value">${formatDuration(monthlyStats.doctor)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Benutzer</th>
              <th>Typ</th>
              <th>Start</th>
              <th>Ende</th>
              <th>Dauer</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyWorkTimes.map(w => `
              <tr>
                <td>${format(new Date(w.startTime), 'dd.MM.yyyy', { locale: de })}</td>
                <td>${w.user.name}</td>
                <td>
                  <span class="badge ${w.type === 'WORK' ? 'badge-work' : w.type === 'HOME_OFFICE' ? 'badge-home' : 'badge-doctor'}">
                    ${typeLabels[w.type] || w.type}
                  </span>
                </td>
                <td>${format(new Date(w.startTime), 'HH:mm', { locale: de })}</td>
                <td>${w.endTime ? format(new Date(w.endTime), 'HH:mm', { locale: de }) : '-'}</td>
                <td>${w.duration ? formatDuration(w.duration) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
        </p>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arbeitszeiten</h1>
          <p className="text-sm text-muted-foreground">Übersicht und Verwaltung aller Arbeitszeiten</p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button onClick={handlePdfExport} variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="border-0 p-0 h-auto font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{monthlyStats.entries} Einträge</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Gesamtzeit</p>
            <p className="text-2xl font-bold">{formatDuration(monthlyStats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Arbeitszeit</p>
            <p className="text-2xl font-bold text-blue-600">{formatDuration(monthlyStats.work)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Homeoffice</p>
            <p className="text-2xl font-bold text-green-600">{formatDuration(monthlyStats.homeOffice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Arztbesuche</p>
            <p className="text-2xl font-bold text-orange-600">{formatDuration(monthlyStats.doctor)}</p>
          </CardContent>
        </Card>
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
