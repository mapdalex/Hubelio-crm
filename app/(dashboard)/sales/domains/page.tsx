'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Globe, AlertTriangle, Calendar, Edit, Trash2, MoreHorizontal } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  notes: string | null
  customer: Customer
}

function DomainForm({
  domain,
  customers,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  domain?: Domain
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
      domainName: formData.get('domainName'),
      registrar: formData.get('registrar'),
      purchaseDate: formData.get('purchaseDate') || null,
      expiryDate: formData.get('expiryDate') || null,
      renewalDate: formData.get('renewalDate') || null,
      autoRenew: (e.currentTarget.querySelector('#autoRenew') as HTMLInputElement)?.checked ?? true,
      costPrice: formData.get('costPrice') ? parseFloat(formData.get('costPrice') as string) : null,
      sellPrice: formData.get('sellPrice') ? parseFloat(formData.get('sellPrice') as string) : null,
      billingCycle: formData.get('billingCycle'),
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
        {!domain && (
          <div className="grid gap-2">
            <Label htmlFor="customerId">Kunde *</Label>
            <Select name="customerId" required>
              <SelectTrigger id="customerId">
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
            <Label htmlFor="domainName">Domain *</Label>
            <Input id="domainName" name="domainName" required placeholder="beispiel.de" defaultValue={domain?.domainName} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="registrar">Registrar</Label>
            <Input id="registrar" name="registrar" placeholder="z.B. IONOS, Strato" defaultValue={domain?.registrar ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="purchaseDate">Kaufdatum</Label>
            <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={toInputDate(domain?.purchaseDate)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expiryDate">Ablaufdatum</Label>
            <Input id="expiryDate" name="expiryDate" type="date" defaultValue={toInputDate(domain?.expiryDate)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="renewalDate">Verlaengerung</Label>
            <Input id="renewalDate" name="renewalDate" type="date" defaultValue={toInputDate(domain?.renewalDate)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="costPrice">Einkaufspreis (EUR)</Label>
            <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={domain?.costPrice ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sellPrice">Verkaufspreis (EUR)</Label>
            <Input id="sellPrice" name="sellPrice" type="number" step="0.01" defaultValue={domain?.sellPrice ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="billingCycle">Abrechnungszyklus</Label>
            <Select name="billingCycle" defaultValue={domain?.billingCycle ?? 'yearly'}>
              <SelectTrigger id="billingCycle"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="yearly">Jaehrlich</SelectItem>
                <SelectItem value="2years">2 Jahre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={domain?.status ?? 'active'}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="expired">Abgelaufen</SelectItem>
                <SelectItem value="transferred">Transferiert</SelectItem>
                <SelectItem value="cancelled">Gekuendigt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-1">
            <div className="flex items-center gap-2">
              <Checkbox id="autoRenew" name="autoRenew" defaultChecked={domain?.autoRenew ?? true} />
              <Label htmlFor="autoRenew">Auto-Verlaengerung</Label>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notizen</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={domain?.notes ?? ''} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {domain ? 'Speichern' : 'Domain anlegen'}
        </Button>
      </DialogFooter>
    </form>
  )
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)

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

  useEffect(() => { loadCustomers() }, [loadCustomers])

  useEffect(() => {
    const timer = setTimeout(() => { loadDomains() }, 300)
    return () => clearTimeout(timer)
  }, [loadDomains])

  const handleCreate = async (data: Record<string, unknown>) => {
    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingDomain) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/domains/${editingDomain.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditingDomain(null)
        loadDomains()
      }
    } catch (error) {
      console.error('Error updating domain:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/domains/${id}`, { method: 'DELETE' })
      loadDomains()
    } catch (error) {
      console.error('Error deleting domain:', error)
    }
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const date = new Date(expiryDate)
    if (isPast(date)) return { label: 'Abgelaufen', variant: 'destructive' as const }
    if (isBefore(date, addDays(new Date(), 30))) return { label: 'Bald ablaufend', variant: 'default' as const }
    return null
  }

  const statusLabel: Record<string, string> = {
    active: 'Aktiv',
    expired: 'Abgelaufen',
    transferred: 'Transferiert',
    cancelled: 'Gekuendigt',
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
            <DialogHeader>
              <DialogTitle>Neue Domain anlegen</DialogTitle>
              <DialogDescription>Erfassen Sie eine neue Domain fuer einen Kunden</DialogDescription>
            </DialogHeader>
            <DomainForm customers={customers} onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDomain} onOpenChange={(open) => !open && setEditingDomain(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Domain bearbeiten</DialogTitle>
            <DialogDescription>Angaben zur Domain aktualisieren</DialogDescription>
          </DialogHeader>
          {editingDomain && (
            <DomainForm
              domain={editingDomain}
              customers={customers}
              onSubmit={handleEdit}
              onCancel={() => setEditingDomain(null)}
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
                placeholder="Domain oder Kunde suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1) }}>
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
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => {
                    const expiryStatus = getExpiryStatus(domain.expiryDate)
                    return (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{domain.domainName}</span>
                            {domain.autoRenew && (
                              <Badge variant="outline" className="text-xs">Auto</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${domain.customer.id}`} className="hover:underline">
                            {domain.customer.company || `${domain.customer.firstName} ${domain.customer.lastName}`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{domain.registrar || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {domain.expiryDate ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(domain.expiryDate), 'dd.MM.yyyy', { locale: de })}
                              </span>
                            ) : '-'}
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant} className="text-xs">{expiryStatus.label}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {domain.sellPrice != null ? `${Number(domain.sellPrice).toFixed(2)} EUR` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={domain.status === 'active' ? 'default' : 'secondary'}>
                            {statusLabel[domain.status] ?? domain.status}
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
                                <DropdownMenuItem onClick={() => setEditingDomain(domain)}>
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
                                <AlertDialogTitle>Domain loeschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Moechten Sie die Domain <strong>{domain.domainName}</strong> wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(domain.id)}>Loeschen</AlertDialogAction>
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
