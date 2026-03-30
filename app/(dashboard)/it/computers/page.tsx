'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Monitor, Laptop, Server, Edit, Trash2, MoreHorizontal, Shield, Calendar } from 'lucide-react'
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

type Computer = {
  id: string
  name: string
  type: string | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  operatingSystem: string | null
  processor: string | null
  ram: string | null
  storage: string | null
  ipAddress: string | null
  macAddress: string | null
  purchaseDate: string | null
  warrantyUntil: string | null
  notes: string | null
  isActive: boolean
  customer: Customer
}

function ComputerForm({
  computer,
  customers,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  computer?: Computer
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
      type: formData.get('type'),
      manufacturer: formData.get('manufacturer'),
      model: formData.get('model'),
      serialNumber: formData.get('serialNumber'),
      operatingSystem: formData.get('operatingSystem'),
      processor: formData.get('processor'),
      ram: formData.get('ram'),
      storage: formData.get('storage'),
      ipAddress: formData.get('ipAddress'),
      macAddress: formData.get('macAddress'),
      purchaseDate: formData.get('purchaseDate') || null,
      warrantyUntil: formData.get('warrantyUntil') || null,
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
        {!computer && (
          <div className="grid gap-2">
            <Label htmlFor="customerId">Kunde *</Label>
            <Select name="customerId" required>
              <SelectTrigger id="customerId">
                <SelectValue placeholder="Kunde waehlen" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName || `${c.firstName} ${c.lastName}`} ({c.customerNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Geraetename *</Label>
            <Input id="name" name="name" required placeholder="z.B. PC-Buero-01" defaultValue={computer?.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Geraetetyp</Label>
            <Select name="type" defaultValue={computer?.type ?? 'Desktop'}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Desktop">Desktop</SelectItem>
                <SelectItem value="Laptop">Laptop</SelectItem>
                <SelectItem value="Server">Server</SelectItem>
                <SelectItem value="Workstation">Workstation</SelectItem>
                <SelectItem value="Tablet">Tablet</SelectItem>
                <SelectItem value="Sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="manufacturer">Hersteller</Label>
            <Input id="manufacturer" name="manufacturer" placeholder="z.B. Dell, HP, Lenovo" defaultValue={computer?.manufacturer ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">Modell</Label>
            <Input id="model" name="model" placeholder="z.B. OptiPlex 7090" defaultValue={computer?.model ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="serialNumber">Seriennummer</Label>
            <Input id="serialNumber" name="serialNumber" placeholder="S/N" defaultValue={computer?.serialNumber ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operatingSystem">Betriebssystem</Label>
            <Input id="operatingSystem" name="operatingSystem" placeholder="z.B. Windows 11 Pro" defaultValue={computer?.operatingSystem ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="processor">Prozessor</Label>
            <Input id="processor" name="processor" placeholder="z.B. Intel i7-12700" defaultValue={computer?.processor ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ram">RAM</Label>
            <Input id="ram" name="ram" placeholder="z.B. 16 GB" defaultValue={computer?.ram ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storage">Speicher</Label>
            <Input id="storage" name="storage" placeholder="z.B. 512 GB SSD" defaultValue={computer?.storage ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ipAddress">IP-Adresse</Label>
            <Input id="ipAddress" name="ipAddress" placeholder="z.B. 192.168.1.100" defaultValue={computer?.ipAddress ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="macAddress">MAC-Adresse</Label>
            <Input id="macAddress" name="macAddress" placeholder="z.B. AA:BB:CC:DD:EE:FF" defaultValue={computer?.macAddress ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="purchaseDate">Kaufdatum</Label>
            <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={toInputDate(computer?.purchaseDate)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="warrantyUntil">Garantie bis</Label>
            <Input id="warrantyUntil" name="warrantyUntil" type="date" defaultValue={toInputDate(computer?.warrantyUntil)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notizen</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={computer?.notes ?? ''} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="isActive" name="isActive" defaultChecked={computer?.isActive ?? true} />
          <Label htmlFor="isActive">Aktiv</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
          {computer ? 'Speichern' : 'Geraet anlegen'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ITComputersPage() {
  const [computers, setComputers] = useState<Computer[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null)

  const loadComputers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/computers?page=${page}&search=${encodeURIComponent(search)}&filter=${filter}`)
      const data = await res.json()
      setComputers(data.computers || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error loading computers:', error)
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
    const timer = setTimeout(() => { loadComputers() }, 300)
    return () => clearTimeout(timer)
  }, [loadComputers])

  const handleCreate = async (data: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/computers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setIsCreateOpen(false)
        loadComputers()
      }
    } catch (error) {
      console.error('Error creating computer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingComputer) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/computers/${editingComputer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setEditingComputer(null)
        loadComputers()
      }
    } catch (error) {
      console.error('Error updating computer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/computers/${id}`, { method: 'DELETE' })
      loadComputers()
    } catch (error) {
      console.error('Error deleting computer:', error)
    }
  }

  const getWarrantyStatus = (warrantyUntil: string | null) => {
    if (!warrantyUntil) return null
    const date = new Date(warrantyUntil)
    if (isPast(date)) return { label: 'Abgelaufen', variant: 'destructive' as const }
    if (isBefore(date, addDays(new Date(), 30))) return { label: 'Bald ablaufend', variant: 'default' as const }
    return null
  }

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'Laptop': return <Laptop className="h-4 w-4 text-muted-foreground" />
      case 'Server': return <Server className="h-4 w-4 text-muted-foreground" />
      default: return <Monitor className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PCs und Geraete</h1>
          <p className="text-muted-foreground">Verwalten Sie alle IT-Geraete Ihrer Kunden</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Geraet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Geraet anlegen</DialogTitle>
              <DialogDescription>Erfassen Sie ein neues Geraet fuer einen Kunden</DialogDescription>
            </DialogHeader>
            <ComputerForm customers={customers} onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingComputer} onOpenChange={(open) => !open && setEditingComputer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Geraet bearbeiten</DialogTitle>
            <DialogDescription>Angaben zum Geraet aktualisieren</DialogDescription>
          </DialogHeader>
          {editingComputer && (
            <ComputerForm
              computer={editingComputer}
              customers={customers}
              onSubmit={handleEdit}
              onCancel={() => setEditingComputer(null)}
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
                placeholder="Name, Seriennummer, IP oder Kunde suchen..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1) }}>
              <TabsList>
                <TabsTrigger value="all">Alle</TabsTrigger>
                <TabsTrigger value="active">Aktiv</TabsTrigger>
                <TabsTrigger value="warranty">
                  <Shield className="mr-1 h-3 w-3" />
                  Garantie
                </TabsTrigger>
                <TabsTrigger value="inactive">Inaktiv</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : computers.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Keine Geraete gefunden</h3>
              <p className="text-muted-foreground">
                {search ? 'Versuchen Sie einen anderen Suchbegriff' : 'Legen Sie Ihr erstes Geraet an'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Geraet</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Betriebssystem</TableHead>
                    <TableHead>IP-Adresse</TableHead>
                    <TableHead>Garantie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computers.map((computer) => {
                    const warrantyStatus = getWarrantyStatus(computer.warrantyUntil)
                    return (
                      <TableRow key={computer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(computer.type)}
                            <div>
                              <span className="font-medium">{computer.name}</span>
                              {computer.manufacturer && computer.model && (
                                <p className="text-xs text-muted-foreground">
                                  {computer.manufacturer} {computer.model}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${computer.customer.id}`} className="hover:underline">
                            {computer.customer.companyName || `${computer.customer.firstName} ${computer.customer.lastName}`}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{computer.type || 'Sonstige'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {computer.operatingSystem || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {computer.ipAddress || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {computer.warrantyUntil ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(computer.warrantyUntil), 'dd.MM.yyyy', { locale: de })}
                              </span>
                            ) : '-'}
                            {warrantyStatus && (
                              <Badge variant={warrantyStatus.variant} className="text-xs">{warrantyStatus.label}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={computer.isActive ? 'default' : 'secondary'}>
                            {computer.isActive ? 'Aktiv' : 'Inaktiv'}
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
                                <DropdownMenuItem onClick={() => setEditingComputer(computer)}>
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
                                <AlertDialogTitle>Geraet loeschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Moechten Sie das Geraet <strong>{computer.name}</strong> wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(computer.id)}>Loeschen</AlertDialogAction>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Zurueck
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Seite {page} von {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
