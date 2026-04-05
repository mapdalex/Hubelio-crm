'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Calendar, Clock, Filter, ArrowUpDown, Download, Trash2, Edit2 } from 'lucide-react'
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
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { WorklogForm } from './worklog-form'

type Worklog = {
  id: string
  startTime: string
  endTime: string
  duration: number
  description: string | null
  user: { name: string }
  customer: { id: string; companyName: string | null; firstName: string; lastName: string }
  project: { name: string; color: string }
  activity: { name: string }
}

export function WorklogClient() {
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadWorklogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
      })
      if (selectedCustomer) params.append('customerId', selectedCustomer)
      if (selectedProject) params.append('projectId', selectedProject)

      const res = await fetch(`/api/worklogs?${params}`)
      const data = await res.json()
      setWorklogs(data)
    } catch (error) {
      console.error('Error loading worklogs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedMonth, selectedCustomer, selectedProject])

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?page=1&limit=1000')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
    loadProjects()
  }, [loadCustomers, loadProjects])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorklogs()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadWorklogs])

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return
    try {
      const res = await fetch(`/api/worklogs/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadWorklogs()
      }
    } catch (error) {
      console.error('Error deleting worklog:', error)
    }
  }

  const handleExportPDF = async () => {
    if (!selectedCustomer) {
      alert('Bitte wählen Sie einen Kunden aus')
      return
    }
    try {
      const url = `/api/worklogs/export/pdf?customerId=${selectedCustomer}&month=${selectedMonth}`
      const a = document.createElement('a')
      a.href = url
      a.download = `worklog_${selectedMonth}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const totalHours = worklogs.reduce((sum, log) => sum + log.duration / 60, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worklog</h1>
          <p className="text-muted-foreground">Erfassen Sie Ihre Arbeitszeiten für die Kundenabrechnung</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Eintrag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Worklog erstellen</DialogTitle>
              <DialogDescription>
                Erfassen Sie eine neue Arbeitsstunde
              </DialogDescription>
            </DialogHeader>
            <WorklogForm
              customers={customers}
              projects={projects}
              onSuccess={() => {
                setIsCreateOpen(false)
                loadWorklogs()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Monat</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Kunde</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Kunden</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName || `${c.firstName} ${c.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Projekt</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Projekte</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : worklogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Einträge</h3>
              <p className="text-muted-foreground">
                Erstellen Sie Ihren ersten Worklog
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Tätigkeit</TableHead>
                    <TableHead className="text-right">Dauer</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worklogs.map((log) => {
                    const date = new Date(log.startTime)
                    const hours = (log.duration / 60).toFixed(2)
                    return (
                      <TableRow key={log.id}>
                        <TableCell>{date.toLocaleDateString('de-DE')}</TableCell>
                        <TableCell>{log.user.name}</TableCell>
                        <TableCell>
                          {log.customer.companyName || `${log.customer.firstName} ${log.customer.lastName}`}
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: log.project.color }}>
                            {log.project.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.activity.name}</TableCell>
                        <TableCell className="text-right font-medium">{hours} h</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.description?.substring(0, 20)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <span className="sr-only">Menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingId(log.id)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(log.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 text-right font-semibold">
                Gesamt: {totalHours.toFixed(2)} Stunden
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
