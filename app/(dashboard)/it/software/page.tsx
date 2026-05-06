'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Package, Edit, Trash2, MoreHorizontal, Calendar, Cloud, Key, RefreshCw, Monitor, User, Building2 } from 'lucide-react'
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
  companyName: string | null
  firstName: string
  lastName: string
}

type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

type Computer = {
  id: string
  name: string
  type: string | null
}

type Software = {
  id: string
  name: string
  type: string
  version: string | null
  manufacturer: string | null
  description: string | null
  licenseKey: string | null
  licenseType: string | null
  seats: number | null
  purchasePrice: string | null
  recurringPrice: string | null
  billingCycle: string | null
  currency: string
  purchaseDate: string | null
  expiryDate: string | null
  renewalDate: string | null
  autoRenew: boolean
  notes: string | null
  isActive: boolean
  customer: Customer | null
  contact: Contact | null
  computer: Computer | null
}

const SOFTWARE_TYPES = [
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'LICENSE', label: 'Lizenz' },
  { value: 'CLOUD_SERVICE', label: 'Cloud Service' },
  { value: 'SUBSCRIPTION', label: 'Abonnement' },
  { value: 'SUPPORT', label: 'Support-Vertrag' },
  { value: 'OTHER', label: 'Sonstiges' },
]

const LICENSE_TYPES = [
  { value: 'Single', label: 'Einzellizenz' },
  { value: 'Volume', label: 'Volumenlizenz' },
  { value: 'Subscription', label: 'Abo-Lizenz' },
  { value: 'OEM', label: 'OEM-Lizenz' },
  { value: 'Perpetual', label: 'Dauerlizenz' },
  { value: 'Trial', label: 'Testversion' },
]

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Vierteljaehrlich' },
  { value: 'yearly', label: 'Jaehrlich' },
  { value: 'one-time', label: 'Einmalig' },
]

function SoftwareForm({
  software,
  customers,
  contacts,
  computers,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  software?: Software
  customers: Customer[]
  contacts: Contact[]
  computers: Computer[]
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(software?.customer?.id || '')
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [filteredComputers, setFilteredComputers] = useState<Computer[]>([])

  useEffect(() => {
    if (selectedCustomerId) {
      // Load contacts and computers for the selected customer
      fetch(`/api/customers/${selectedCustomerId}/contacts`)
        .then(res => res.json())
        .then(data => setFilteredContacts(data.contacts || []))
        .catch(() => setFilteredContacts([]))
      
      fetch(`/api/customers/${selectedCustomerId}/computers`)
        .then(res => res.json())
        .then(data => setFilteredComputers(data.computers || []))
        .catch(() => setFilteredComputers([]))
    } else {
      setFilteredContacts([])
      setFilteredComputers([])
    }
  }, [selectedCustomerId])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      name: formData.get('name'),
      type: formData.get('type'),
      version: formData.get('version'),
      manufacturer: formData.get('manufacturer'),
      description: formData.get('description'),
      licenseKey: formData.get('licenseKey'),
      licenseType: formData.get('licenseType'),
      seats: formData.get('seats'),
      purchasePrice: formData.get('purchasePrice'),
      recurringPrice: formData.get('recurringPrice'),
      billingCycle: formData.get('billingCycle'),
      currency: formData.get('currency') || 'EUR',
      purchaseDate: formData.get('purchaseDate') || null,
      expiryDate: formData.get('expiryDate') || null,
      renewalDate: formData.get('renewalDate') || null,
      autoRenew: (e.currentTarget.querySelector('#autoRenew') as HTMLInputElement)?.checked ?? false,
      customerId: formData.get('customerId') || null,
      contactId: formData.get('contactId') || null,
      computerId: formData.get('computerId') || null,
      notes: formData.get('notes'),
      isActive: (e.currentTarget.querySelector('#isActive') as HTMLInputElement)?.checked ?? true,
    })
  }

  const toInputDate = (val: string | null | undefined) => {
    if (!val) return ''
    return format(new Date(val), 'yyyy-MM-dd')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Basis-Infos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required placeholder="z.B. Microsoft 365" defaultValue={software?.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Typ *</Label>
            <Select name="type" defaultValue={software?.type ?? 'SOFTWARE'}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOFTWARE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="manufacturer">Hersteller</Label>
            <Input id="manufacturer" name="manufacturer" placeholder="z.B. Microsoft, Adobe" defaultValue={software?.manufacturer ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="version">Version</Label>
            <Input id="version" name="version" placeholder="z.B. 2024, v5.0" defaultValue={software?.version ?? ''} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea id="description" name="description" rows={2} placeholder="Kurze Beschreibung der Software/Service" defaultValue={software?.description ?? ''} />
        </div>

        {/* Lizenz-Infos */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Lizenz-Informationen</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="licenseKey">Lizenzschluessel</Label>
              <Input id="licenseKey" name="licenseKey" placeholder="XXXXX-XXXXX-XXXXX" defaultValue={software?.licenseKey ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="licenseType">Lizenztyp</Label>
              <Select name="licenseType" defaultValue={software?.licenseType ?? ''}>
                <SelectTrigger id="licenseType"><SelectValue placeholder="Waehlen..." /></SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 mt-4">
            <Label htmlFor="seats">Anzahl Lizenzen/Sitze</Label>
            <Input id="seats" name="seats" type="number" min="1" placeholder="z.B. 5" defaultValue={software?.seats ?? ''} />
          </div>
        </div>

        {/* Kosten */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Kosten</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="purchasePrice">Kaufpreis</Label>
              <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0" placeholder="0.00" defaultValue={software?.purchasePrice ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recurringPrice">Wiederk. Kosten</Label>
              <Input id="recurringPrice" name="recurringPrice" type="number" step="0.01" min="0" placeholder="0.00" defaultValue={software?.recurringPrice ?? ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingCycle">Abrechnungszyklus</Label>
              <Select name="billingCycle" defaultValue={software?.billingCycle ?? ''}>
                <SelectTrigger id="billingCycle"><SelectValue placeholder="Waehlen..." /></SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Daten */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Laufzeit</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="purchaseDate">Kaufdatum</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={toInputDate(software?.purchaseDate)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiryDate">Ablaufdatum</Label>
              <Input id="expiryDate" name="expiryDate" type="date" defaultValue={toInputDate(software?.expiryDate)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="renewalDate">Erneuerungsdatum</Label>
              <Input id="renewalDate" name="renewalDate" type="date" defaultValue={toInputDate(software?.renewalDate)} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Checkbox id="autoRenew" name="autoRenew" defaultChecked={software?.autoRenew ?? false} />
            <Label htmlFor="autoRenew">Automatische Verlaengerung</Label>
          </div>
        </div>

        {/* Zuweisungen */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Zuweisung</h4>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerId">Firma/Kunde</Label>
              <Select 
                name="customerId" 
                defaultValue={software?.customer?.id ?? ''} 
                onValueChange={(value) => setSelectedCustomerId(value)}
              >
                <SelectTrigger id="customerId"><SelectValue placeholder="Keine Zuweisung" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Zuweisung</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName || `${c.firstName} ${c.lastName}`} ({c.customerNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contactId">Kontakt</Label>
                <Select name="contactId" defaultValue={software?.contact?.id ?? ''}>
                  <SelectTrigger id="contactId"><SelectValue placeholder="Kein Kontakt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Kontakt</SelectItem>
                    {filteredContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="computerId">Installiert auf PC</Label>
                <Select name="computerId" defaultValue={software?.computer?.id ?? ''}>
                  <SelectTrigger id="computerId"><SelectValue placeholder="Kein PC" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein PC</SelectItem>
                    {filteredComputers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.type ? `(${c.type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Notizen */}
        <div className="border-t pt-4">
          <div className="grid gap-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={software?.notes ?? ''} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Checkbox id="isActive" name="isActive" defaultChecked={software?.isActive ?? true} />
            <Label htmlFor="isActive">Aktiv</Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {software ? 'Speichern' : 'Erstellen'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ITSoftwarePage() {
  const [software, setSoftware] = useState<Software[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [computers, setComputers] = useState<Computer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null)

  const loadSoftware = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        filter,
      })
      if (typeFilter) params.set('type', typeFilter)
      
      const res = await fetch(`/api/software?${params}`)
      const data = await res.json()
      
      if (data.error && !data.software) {
        setError(data.error)
        setSoftware([])
      } else {
        setSoftware(data.software || [])
        setTotalPages(data.pagination?.totalPages || 1)
        if (data.error) setError(data.error)
      }
    } catch (err) {
      console.error('Error loading software:', err)
      setError('Verbindungsfehler beim Laden der Software')
      setSoftware([])
    } finally {
      setIsLoading(false)
    }
  }, [page, search, filter, typeFilter])

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
    const timer = setTimeout(() => { loadSoftware() }, 300)
    return () => clearTimeout(timer)
  }, [loadSoftware])

  const handleCreate = async (data: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/software', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setIsCreateOpen(false)
        loadSoftware()
      }
    } catch (error) {
      console.error('Error creating software:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingSoftware) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/software/${editingSoftware.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditingSoftware(null)
        loadSoftware()
      }
    } catch (error) {
      console.error('Error updating software:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/software/${id}`, { method: 'DELETE' })
      loadSoftware()
    } catch (error) {
      console.error('Error deleting software:', error)
    }
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const date = new Date(expiryDate)
    if (isPast(date)) return { label: 'Abgelaufen', variant: 'destructive' as const }
    if (isBefore(date, addDays(new Date(), 30))) return { label: 'Bald ablaufend', variant: 'default' as const }
    return null
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLOUD_SERVICE': return <Cloud className="h-4 w-4 text-muted-foreground" />
      case 'LICENSE': return <Key className="h-4 w-4 text-muted-foreground" />
      case 'SUBSCRIPTION': return <RefreshCw className="h-4 w-4 text-muted-foreground" />
      default: return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTypeLabel = (type: string) => {
    return SOFTWARE_TYPES.find(t => t.value === type)?.label || type
  }

  const formatPrice = (price: string | null, currency: string) => {
    if (!price) return '-'
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(parseFloat(price))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Software & Services</h1>
          <p className="text-muted-foreground">Verwalten Sie Software, Lizenzen und Cloud-Services</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Software
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neue Software anlegen</DialogTitle>
              <DialogDescription>Erfassen Sie eine neue Software, Lizenz oder einen Cloud-Service</DialogDescription>
            </DialogHeader>
            <SoftwareForm 
              customers={customers} 
              contacts={contacts} 
              computers={computers} 
              onSubmit={handleCreate} 
              onCancel={() => setIsCreateOpen(false)} 
              isSubmitting={isSubmitting} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSoftware} onOpenChange={(open) => !open && setEditingSoftware(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Software bearbeiten</DialogTitle>
            <DialogDescription>Angaben zur Software aktualisieren</DialogDescription>
          </DialogHeader>
          {editingSoftware && (
            <SoftwareForm
              software={editingSoftware}
              customers={customers}
              contacts={contacts}
              computers={computers}
              onSubmit={handleEdit}
              onCancel={() => setEditingSoftware(null)}
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
                placeholder="Name, Hersteller, Kunde suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Alle Typen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle Typen</SelectItem>
                {SOFTWARE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1) }}>
              <TabsList>
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="active">Aktiv</TabsTrigger>
                <TabsTrigger value="expiring">
                  <Calendar className="mr-1 h-3 w-3" />
                  Ablaufend
                </TabsTrigger>
                <TabsTrigger value="inactive">Inaktiv</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
              <p className="font-medium">Hinweis:</p>
              <p>{error}</p>
              <p className="mt-2 text-xs opacity-75">Fuehre <code className="bg-muted px-1 py-0.5 rounded">npx prisma db push</code> aus, um die Datenbank zu aktualisieren.</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : software.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Software gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihre erste Software an'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Zuweisung</TableHead>
                    <TableHead>Lizenz</TableHead>
                    <TableHead>Kosten</TableHead>
                    <TableHead>Ablauf</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {software.map((sw) => {
                    const expiryStatus = getExpiryStatus(sw.expiryDate)
                    return (
                      <TableRow key={sw.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(sw.type)}
                            <div>
                              <span className="font-medium">{sw.name}</span>
                              {sw.manufacturer && (
                                <p className="text-xs text-muted-foreground">
                                  {sw.manufacturer} {sw.version && `v${sw.version}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(sw.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {sw.customer && (
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <Link href={`/customers/${sw.customer.id}`} className="hover:underline">
                                  {sw.customer.companyName || `${sw.customer.firstName} ${sw.customer.lastName}`}
                                </Link>
                              </div>
                            )}
                            {sw.contact && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {sw.contact.firstName} {sw.contact.lastName}
                              </div>
                            )}
                            {sw.computer && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Monitor className="h-3 w-3" />
                                {sw.computer.name}
                              </div>
                            )}
                            {!sw.customer && !sw.contact && !sw.computer && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {sw.licenseType && (
                              <Badge variant="secondary" className="text-xs">{sw.licenseType}</Badge>
                            )}
                            {sw.seats && (
                              <p className="text-xs text-muted-foreground">{sw.seats} Sitze</p>
                            )}
                            {!sw.licenseType && !sw.seats && '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {sw.recurringPrice ? (
                              <p className="text-sm">
                                {formatPrice(sw.recurringPrice, sw.currency)}
                                {sw.billingCycle && (
                                  <span className="text-xs text-muted-foreground">
                                    /{sw.billingCycle === 'monthly' ? 'Mo' : sw.billingCycle === 'yearly' ? 'Jahr' : sw.billingCycle}
                                  </span>
                                )}
                              </p>
                            ) : sw.purchasePrice ? (
                              <p className="text-sm">{formatPrice(sw.purchasePrice, sw.currency)}</p>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {sw.expiryDate ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(sw.expiryDate), 'dd.MM.yyyy', { locale: de })}
                              </span>
                            ) : '-'}
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant} className="text-xs">{expiryStatus.label}</Badge>
                            )}
                            {sw.autoRenew && (
                              <Badge variant="outline" className="text-xs">
                                <RefreshCw className="h-2 w-2 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sw.isActive ? 'default' : 'secondary'}>
                            {sw.isActive ? 'Aktiv' : 'Inaktiv'}
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
                                <DropdownMenuItem onClick={() => setEditingSoftware(sw)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Loeschen
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Software loeschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Moechten Sie &quot;{sw.name}&quot; wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sw.id)}>Loeschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Seite {page} von {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Zurueck
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
