'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, ShoppingCart, Calendar, RefreshCw, Edit, Trash2, MoreHorizontal } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, addDays, isBefore } from 'date-fns'
import { de } from 'date-fns/locale'

type Customer = {
  id: string
  customerNumber: string
  company: string | null
  firstName: string
  lastName: string
}

type Service = {
  id: string
  name: string
  description: string | null
  type: string | null
  startDate: string | null
  endDate: string | null
  renewalDate: string | null
  billingCycle: string | null
  costPrice: number | null
  sellPrice: number | null
  status: string
  notes: string | null
  customer: Customer
}

function ServiceForm({
  service,
  customers,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  service?: Service
  customers: Customer[]
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      customerId: formData.get('customerId'),
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type'),
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      renewalDate: formData.get('renewalDate') || null,
      billingCycle: formData.get('billingCycle'),
      costPrice: formData.get('costPrice') ? parseFloat(formData.get('costPrice') as string) : null,
      sellPrice: formData.get('sellPrice') ? parseFloat(formData.get('sellPrice') as string) : null,
      status: formData.get('status'),
      notes: formData.get('notes'),
    })
  }

  const toInputDate = (val: string | null | undefined) => {
    if (!val) return ''
    return format(new Date(val), 'yyyy-MM-dd')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        {!service && (
          <div className="grid gap-2">
            <Label htmlFor="svc-customerId">Kunde *</Label>
            <Select name="customerId" required>
              <SelectTrigger id="svc-customerId">
                <SelectValue placeholder="Kunde waehlen" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company || `${c.firstName} ${c.lastName}`} ({c.customerNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="svc-name">Name *</Label>
            <Input id="svc-name" name="name" required placeholder="z.B. Webhosting" defaultValue={service?.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-type">Typ</Label>
            <Select name="type" defaultValue={service?.type ?? ''}>
              <SelectTrigger id="svc-type"><SelectValue placeholder="Typ waehlen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Hosting">Hosting</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
                <SelectItem value="Wartung">Wartung</SelectItem>
                <SelectItem value="Lizenz">Lizenz</SelectItem>
                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="svc-description">Beschreibung</Label>
          <Textarea id="svc-description" name="description" rows={2} defaultValue={service?.description ?? ''} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="svc-startDate">Startdatum</Label>
            <Input id="svc-startDate" name="startDate" type="date" defaultValue={toInputDate(service?.startDate)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-endDate">Enddatum</Label>
            <Input id="svc-endDate" name="endDate" type="date" defaultValue={toInputDate(service?.endDate)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-renewalDate">Naechste Abrechnung</Label>
            <Input id="svc-renewalDate" name="renewalDate" type="date" defaultValue={toInputDate(service?.renewalDate)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="svc-costPrice">Einkaufspreis (EUR)</Label>
            <Input id="svc-costPrice" name="costPrice" type="number" step="0.01" defaultValue={service?.costPrice ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-sellPrice">Verkaufspreis (EUR)</Label>
            <Input id="svc-sellPrice" name="sellPrice" type="number" step="0.01" defaultValue={service?.sellPrice ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-billingCycle">Abrechnungszyklus</Label>
            <Select name="billingCycle" defaultValue={service?.billingCycle ?? 'monthly'}>
              <SelectTrigger id="svc-billingCycle"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="quarterly">Quartal</SelectItem>
                <SelectItem value="yearly">Jaehrlich</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="svc-status">Status</Label>
          <Select name="status" defaultValue={service?.status ?? 'active'}>
            <SelectTrigger id="svc-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="paused">Pausiert</SelectItem>
              <SelectItem value="cancelled">Gekuendigt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="svc-notes">Notizen</Label>
          <Textarea id="svc-notes" name="notes" rows={2} defaultValue={service?.notes ?? ''} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {service ? 'Speichern' : 'Service anlegen'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const loadServices = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/services?page=${page}&search=${encodeURIComponent(search)}&filter=${filter}`)
      const data = await res.json()
      setServices(data.services || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, filter])

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=100')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  useEffect(() => {
    const timer = setTimeout(() => { loadServices() }, 300)
    return () => clearTimeout(timer)
  }, [loadServices])

  const handleCreate = async (data: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setIsCreateOpen(false)
        loadServices()
      }
    } catch (error) {
      console.error('Error creating service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingService) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditingService(null)
        loadServices()
      }
    } catch (error) {
      console.error('Error updating service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' })
      loadServices()
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const getRenewalStatus = (renewalDate: string | null) => {
    if (!renewalDate) return null
    const date = new Date(renewalDate)
    const now = new Date()
    if (isBefore(date, addDays(now, 7))) return { label: 'Diese Woche', variant: 'destructive' as const }
    if (isBefore(date, addDays(now, 30))) return { label: 'Diesen Monat', variant: 'default' as const }
    return null
  }

  const cycleLabel: Record<string, string> = {
    monthly: 'Monatlich',
    quarterly: 'Quartal',
    yearly: 'Jaehrlich',
  }

  const statusLabel: Record<string, string> = {
    active: 'Aktiv',
    paused: 'Pausiert',
    cancelled: 'Gekuendigt',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Verwalten Sie wiederkehrende Services</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neuen Service anlegen</DialogTitle>
              <DialogDescription>Erfassen Sie einen wiederkehrenden Service fuer einen Kunden</DialogDescription>
            </DialogHeader>
            <ServiceForm customers={customers} onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Service bearbeiten</DialogTitle>
            <DialogDescription>Angaben zum Service aktualisieren</DialogDescription>
          </DialogHeader>
          {editingService && (
            <ServiceForm
              service={editingService}
              customers={customers}
              onSubmit={handleEdit}
              onCancel={() => setEditingService(null)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Service oder Kunde suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1) }}>
              <TabsList>
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="renewal">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Abrechnung
                </TabsTrigger>
                <TabsTrigger value="active">Aktiv</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Services gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihren ersten Service an'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Zyklus</TableHead>
                    <TableHead>Naechste Abrechnung</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => {
                    const renewalStatus = getRenewalStatus(service.renewalDate)
                    return (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">{service.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${service.customer.id}`} className="hover:underline">
                            {service.customer.company || `${service.customer.firstName} ${service.customer.lastName}`}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {service.type && <Badge variant="outline">{service.type}</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cycleLabel[service.billingCycle ?? ''] ?? service.billingCycle ?? '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {service.renewalDate ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(service.renewalDate), 'dd.MM.yyyy', { locale: de })}
                              </span>
                            ) : '-'}
                            {renewalStatus && (
                              <Badge variant={renewalStatus.variant} className="text-xs">{renewalStatus.label}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {service.sellPrice != null ? `${Number(service.sellPrice).toFixed(2)} EUR` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {statusLabel[service.status] ?? service.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingService(service)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Loeschen
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Service loeschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Moechten Sie den Service <strong>{service.name}</strong> wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(service.id)}>Loeschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Zurueck</Button>
                  <span className="text-sm text-muted-foreground">Seite {page} von {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Weiter</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
