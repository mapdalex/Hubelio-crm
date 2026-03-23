'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, ShoppingCart, Calendar, RefreshCw } from 'lucide-react'
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
  customer: Customer
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
  const [isCreating, setIsCreating] = useState(false)
  
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
  
  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      loadServices()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadServices])
  
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      customerId: formData.get('customerId'),
      name: formData.get('name'),
      description: formData.get('description'),
      type: formData.get('type'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      renewalDate: formData.get('renewalDate'),
      costPrice: formData.get('costPrice') ? parseFloat(formData.get('costPrice') as string) : null,
      sellPrice: formData.get('sellPrice') ? parseFloat(formData.get('sellPrice') as string) : null,
      billingCycle: formData.get('billingCycle'),
      notes: formData.get('notes'),
    }
    
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
      setIsCreating(false)
    }
  }
  
  const getRenewalStatus = (renewalDate: string | null) => {
    if (!renewalDate) return null
    const date = new Date(renewalDate)
    const now = new Date()
    
    if (isBefore(date, addDays(now, 7))) {
      return { label: 'Diese Woche', variant: 'destructive' as const }
    }
    if (isBefore(date, addDays(now, 30))) {
      return { label: 'Diesen Monat', variant: 'default' as const }
    }
    return null
  }
  
  const getBillingCycleLabel = (cycle: string | null) => {
    switch (cycle) {
      case 'monthly': return 'Monatlich'
      case 'quarterly': return 'Quartal'
      case 'yearly': return 'Jaehrlich'
      default: return cycle || '-'
    }
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
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Neuen Service anlegen</DialogTitle>
                <DialogDescription>
                  Erfassen Sie einen wiederkehrenden Service fuer einen Kunden
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="service-customerId">Kunde *</Label>
                  <Select name="customerId" required>
                    <SelectTrigger id="service-customerId">
                      <SelectValue placeholder="Kunde waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company || `${customer.firstName} ${customer.lastName}`} ({customer.customerNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="service-name">Name *</Label>
                    <Input id="service-name" name="name" required placeholder="z.B. Webhosting" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service-type">Typ</Label>
                    <Select name="type">
                      <SelectTrigger id="service-type">
                        <SelectValue placeholder="Typ waehlen" />
                      </SelectTrigger>
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
                  <Label htmlFor="service-description">Beschreibung</Label>
                  <Textarea id="service-description" name="description" rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="service-startDate">Startdatum</Label>
                    <Input id="service-startDate" name="startDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service-endDate">Enddatum</Label>
                    <Input id="service-endDate" name="endDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service-renewalDate">Naechste Abrechnung</Label>
                    <Input id="service-renewalDate" name="renewalDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="service-costPrice">Einkaufspreis (EUR)</Label>
                    <Input id="service-costPrice" name="costPrice" type="number" step="0.01" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service-sellPrice">Verkaufspreis (EUR)</Label>
                    <Input id="service-sellPrice" name="sellPrice" type="number" step="0.01" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service-billingCycle">Abrechnungszyklus</Label>
                    <Select name="billingCycle" defaultValue="monthly">
                      <SelectTrigger id="service-billingCycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="quarterly">Quartal</SelectItem>
                        <SelectItem value="yearly">Jaehrlich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service-notes">Notizen</Label>
                  <Textarea id="service-notes" name="notes" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                  Service anlegen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Service oder Kunde suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
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
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {service.description}
                              </div>
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
                        <TableCell>{getBillingCycleLabel(service.billingCycle)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {service.renewalDate 
                              ? format(new Date(service.renewalDate), 'dd.MM.yyyy', { locale: de })
                              : '-'
                            }
                            {renewalStatus && (
                              <Badge variant={renewalStatus.variant} className="text-xs">
                                {renewalStatus.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {service.sellPrice ? `${service.sellPrice} EUR` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
