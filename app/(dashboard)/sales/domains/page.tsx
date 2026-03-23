'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Globe, AlertTriangle, Calendar } from 'lucide-react'
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
import { format, isPast, addDays, isBefore } from 'date-fns'
import { de } from 'date-fns/locale'

type Customer = {
  id: string
  customerNumber: string
  company: string | null
  firstName: string
  lastName: string
}

type Domain = {
  id: string
  domainName: string
  registrar: string | null
  purchaseDate: string | null
  expiryDate: string | null
  renewalDate: string | null
  autoRenew: boolean
  costPrice: number | null
  sellPrice: number | null
  billingCycle: string | null
  status: string
  customer: Customer
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  const loadDomains = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/domains?page=${page}&search=${encodeURIComponent(search)}&filter=${filter}`)
      const data = await res.json()
      setDomains(data.domains || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading domains:', error)
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
      loadDomains()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadDomains])
  
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      customerId: formData.get('customerId'),
      domainName: formData.get('domainName'),
      registrar: formData.get('registrar'),
      purchaseDate: formData.get('purchaseDate'),
      expiryDate: formData.get('expiryDate'),
      renewalDate: formData.get('renewalDate'),
      costPrice: formData.get('costPrice') ? parseFloat(formData.get('costPrice') as string) : null,
      sellPrice: formData.get('sellPrice') ? parseFloat(formData.get('sellPrice') as string) : null,
      billingCycle: formData.get('billingCycle'),
      notes: formData.get('notes'),
    }
    
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setIsCreateOpen(false)
        loadDomains()
      }
    } catch (error) {
      console.error('Error creating domain:', error)
    } finally {
      setIsCreating(false)
    }
  }
  
  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const date = new Date(expiryDate)
    const now = new Date()
    
    if (isPast(date)) {
      return { label: 'Abgelaufen', variant: 'destructive' as const }
    }
    if (isBefore(date, addDays(now, 30))) {
      return { label: 'Bald ablaufend', variant: 'default' as const }
    }
    return null
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">Verwalten Sie registrierte Domains</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Neue Domain anlegen</DialogTitle>
                <DialogDescription>
                  Erfassen Sie eine neue Domain fuer einen Kunden
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Kunde *</Label>
                  <Select name="customerId" required>
                    <SelectTrigger id="customerId">
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
                    <Label htmlFor="domainName">Domain *</Label>
                    <Input id="domainName" name="domainName" required placeholder="beispiel.de" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="registrar">Registrar</Label>
                    <Input id="registrar" name="registrar" placeholder="z.B. IONOS, Strato" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseDate">Kaufdatum</Label>
                    <Input id="purchaseDate" name="purchaseDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiryDate">Ablaufdatum</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="renewalDate">Verlaengerung</Label>
                    <Input id="renewalDate" name="renewalDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="costPrice">Einkaufspreis (EUR)</Label>
                    <Input id="costPrice" name="costPrice" type="number" step="0.01" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sellPrice">Verkaufspreis (EUR)</Label>
                    <Input id="sellPrice" name="sellPrice" type="number" step="0.01" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billingCycle">Abrechnungszyklus</Label>
                    <Select name="billingCycle" defaultValue="yearly">
                      <SelectTrigger id="billingCycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                        <SelectItem value="yearly">Jaehrlich</SelectItem>
                        <SelectItem value="2years">2 Jahre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                  Domain anlegen
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
                placeholder="Domain oder Kunde suchen..."
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
                <TabsTrigger value="expiring">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Ablaufend
                </TabsTrigger>
                <TabsTrigger value="expired">Abgelaufen</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Domains gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihre erste Domain an'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Registrar</TableHead>
                    <TableHead>Ablaufdatum</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => {
                    const expiryStatus = getExpiryStatus(domain.expiryDate)
                    return (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{domain.domainName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${domain.customer.id}`} className="hover:underline">
                            {domain.customer.company || `${domain.customer.firstName} ${domain.customer.lastName}`}
                          </Link>
                        </TableCell>
                        <TableCell>{domain.registrar || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {domain.expiryDate 
                              ? format(new Date(domain.expiryDate), 'dd.MM.yyyy', { locale: de })
                              : '-'
                            }
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant} className="text-xs">
                                {expiryStatus.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {domain.sellPrice ? `${domain.sellPrice} EUR` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={domain.status === 'active' ? 'default' : 'secondary'}>
                            {domain.status}
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
