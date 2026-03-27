'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, User, Phone, Mail, MapPin, Plus, Monitor, Ticket, Edit, Trash2, Globe, Wrench, CalendarClock, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

type Contact = {
  id: string
  firstName: string
  lastName: string
  position: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  isPrimary: boolean
}

type Computer = {
  id: string
  name: string
  type: string | null
  manufacturer: string | null
  model: string | null
  operatingSystem: string | null
  notes: string | null
}

type Domain = {
  id: string
  domainName: string
  registrar: string | null
  expiryDate: string | null
  renewalDate: string | null
  autoRenew: boolean
  sellPrice: number | null
  billingCycle: string | null
  status: string
  notes: string | null
}

type Service = {
  id: string
  name: string
  description: string | null
  type: string | null
  renewalDate: string | null
  billingCycle: string | null
  sellPrice: number | null
  status: string
  notes: string | null
}

type TicketItem = {
  id: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  createdAt: string
}

type Customer = {
  id: string
  customerNumber: string
  company: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  street: string | null
  zipCode: string | null
  city: string | null
  country: string | null
  notes: string | null
  isActive: boolean
  contacts: Contact[]
  computers: Computer[]
  domains: Domain[]
  services: Service[]
  tickets: TicketItem[]
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isComputerOpen, setIsComputerOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null)
  
  const loadCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${id}`)
      const data = await res.json()
      setCustomer(data.customer)
    } catch (error) {
      console.error('Error loading customer:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])
  
  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])
  
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setIsEditing(false)
        loadCustomer()
      }
    } catch (error) {
      console.error('Error saving customer:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/customers')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }
  
  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      position: formData.get('position'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      mobile: formData.get('mobile'),
      isPrimary: formData.get('isPrimary') === 'on',
    }
    
    try {
      const res = await fetch(`/api/customers/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setIsContactOpen(false)
        loadCustomer()
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }
  
  const handleAddComputer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    
    try {
      const res = await fetch(`/api/customers/${id}/computers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setIsComputerOpen(false)
        loadCustomer()
      }
    } catch (error) {
      console.error('Error adding computer:', error)
    }
  }
  
  const handleEditContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingContact) return
    
    const formData = new FormData(e.currentTarget)
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      position: formData.get('position'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      mobile: formData.get('mobile'),
      isPrimary: formData.get('isPrimary') === 'on',
    }
    
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setEditingContact(null)
        loadCustomer()
      }
    } catch (error) {
      console.error('Error editing contact:', error)
    }
  }
  
  const handleDeleteContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      if (res.ok) {
        loadCustomer()
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }
  
  const handleEditComputer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingComputer) return
    
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    
    try {
      const res = await fetch(`/api/computers/${editingComputer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        setEditingComputer(null)
        loadCustomer()
      }
    } catch (error) {
      console.error('Error editing computer:', error)
    }
  }
  
  const handleDeleteComputer = async (computerId: string) => {
    try {
      const res = await fetch(`/api/computers/${computerId}`, { method: 'DELETE' })
      if (res.ok) {
        loadCustomer()
      }
    } catch (error) {
      console.error('Error deleting computer:', error)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  
  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Kunde nicht gefunden</h2>
        <Button asChild className="mt-4">
          <Link href="/customers">Zurueck zur Liste</Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {customer.company || `${customer.firstName} ${customer.lastName}`}
            </h1>
            {!customer.isActive && <Badge variant="secondary">Inaktiv</Badge>}
          </div>
          <p className="text-muted-foreground">{customer.customerNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kunde loeschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rueckgaengig gemacht werden. Alle zugehoerigen Daten werden ebenfalls geloescht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Loeschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Uebersicht</TabsTrigger>
          <TabsTrigger value="contacts">Kontakte ({customer.contacts.length})</TabsTrigger>
          <TabsTrigger value="computers">PCs ({customer.computers.length})</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({customer.tickets.length})</TabsTrigger>
          <TabsTrigger value="sales">Verkauf ({(customer.domains?.length ?? 0) + (customer.services?.length ?? 0)})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kontaktdaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.firstName} {customer.lastName}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                  </div>
                )}
                {customer.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.mobile}`} className="hover:underline">{customer.mobile} (Mobil)</a>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adresse</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.street || customer.city ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {customer.street && <div>{customer.street}</div>}
                      {(customer.zipCode || customer.city) && (
                        <div>{customer.zipCode} {customer.city}</div>
                      )}
                      {customer.country && <div>{customer.country}</div>}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Keine Adresse hinterlegt</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Kontakt hinzufuegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddContact}>
                  <DialogHeader>
                    <DialogTitle>Neuen Kontakt hinzufuegen</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="contact-firstName">Vorname *</Label>
                        <Input id="contact-firstName" name="firstName" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact-lastName">Nachname *</Label>
                        <Input id="contact-lastName" name="lastName" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact-position">Position</Label>
                      <Input id="contact-position" name="position" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact-email">E-Mail</Label>
                      <Input id="contact-email" name="email" type="email" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="contact-phone">Telefon</Label>
                        <Input id="contact-phone" name="phone" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact-mobile">Mobil</Label>
                        <Input id="contact-mobile" name="mobile" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="contact-isPrimary" name="isPrimary" />
                      <Label htmlFor="contact-isPrimary">Hauptkontakt</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsContactOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Hinzufuegen</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {customer.contacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Keine Kontakte</h3>
                <p className="text-muted-foreground">Fuegen Sie den ersten Kontakt hinzu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customer.contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {contact.firstName} {contact.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {contact.isPrimary && <Badge>Hauptkontakt</Badge>}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingContact(contact)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Kontakt loeschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Moechten Sie {contact.firstName} {contact.lastName} wirklich loeschen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>Loeschen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {contact.position && (
                      <CardDescription>{contact.position}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                      </div>
                    )}
                    {contact.mobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${contact.mobile}`} className="hover:underline">{contact.mobile} (Mobil)</a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Edit Contact Dialog */}
          <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
            <DialogContent>
              <form onSubmit={handleEditContact}>
                <DialogHeader>
                  <DialogTitle>Kontakt bearbeiten</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-firstName">Vorname *</Label>
                      <Input id="edit-contact-firstName" name="firstName" defaultValue={editingContact?.firstName} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-lastName">Nachname *</Label>
                      <Input id="edit-contact-lastName" name="lastName" defaultValue={editingContact?.lastName} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contact-position">Position</Label>
                    <Input id="edit-contact-position" name="position" defaultValue={editingContact?.position || ''} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contact-email">E-Mail</Label>
                    <Input id="edit-contact-email" name="email" type="email" defaultValue={editingContact?.email || ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-phone">Telefon</Label>
                      <Input id="edit-contact-phone" name="phone" defaultValue={editingContact?.phone || ''} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-mobile">Mobil</Label>
                      <Input id="edit-contact-mobile" name="mobile" defaultValue={editingContact?.mobile || ''} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit-contact-isPrimary" name="isPrimary" defaultChecked={editingContact?.isPrimary} />
                    <Label htmlFor="edit-contact-isPrimary">Hauptkontakt</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingContact(null)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">Speichern</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="computers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isComputerOpen} onOpenChange={setIsComputerOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  PC hinzufuegen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleAddComputer}>
                  <DialogHeader>
                    <DialogTitle>Neuen PC/Geraet hinzufuegen</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pc-name">Name *</Label>
                        <Input id="pc-name" name="name" required placeholder="z.B. PC-Buero-01" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pc-type">Typ</Label>
                        <Select name="type">
                          <SelectTrigger id="pc-type">
                            <SelectValue placeholder="Typ waehlen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Desktop">Desktop</SelectItem>
                            <SelectItem value="Laptop">Laptop</SelectItem>
                            <SelectItem value="Server">Server</SelectItem>
                            <SelectItem value="Drucker">Drucker</SelectItem>
                            <SelectItem value="Router">Router</SelectItem>
                            <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pc-manufacturer">Hersteller</Label>
                        <Input id="pc-manufacturer" name="manufacturer" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pc-model">Modell</Label>
                        <Input id="pc-model" name="model" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pc-serialNumber">Seriennummer</Label>
                      <Input id="pc-serialNumber" name="serialNumber" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pc-operatingSystem">Betriebssystem</Label>
                      <Input id="pc-operatingSystem" name="operatingSystem" placeholder="z.B. Windows 11 Pro" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pc-processor">Prozessor</Label>
                        <Input id="pc-processor" name="processor" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pc-ram">RAM</Label>
                        <Input id="pc-ram" name="ram" placeholder="z.B. 16 GB" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pc-storage">Speicher</Label>
                        <Input id="pc-storage" name="storage" placeholder="z.B. 512 GB SSD" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pc-ipAddress">IP-Adresse</Label>
                        <Input id="pc-ipAddress" name="ipAddress" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pc-macAddress">MAC-Adresse</Label>
                        <Input id="pc-macAddress" name="macAddress" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pc-notes">Notizen</Label>
                      <Textarea id="pc-notes" name="notes" rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsComputerOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Hinzufuegen</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {customer.computers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Monitor className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Keine PCs/Geraete</h3>
                <p className="text-muted-foreground">Fuegen Sie das erste Geraet hinzu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customer.computers.map((computer) => (
                <Card key={computer.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        {computer.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {computer.type && <Badge variant="outline">{computer.type}</Badge>}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingComputer(computer)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Geraet loeschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Moechten Sie {computer.name} wirklich loeschen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteComputer(computer.id)}>Loeschen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {computer.manufacturer && computer.model && (
                      <CardDescription>{computer.manufacturer} {computer.model}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {computer.operatingSystem && (
                      <div><span className="text-muted-foreground">OS:</span> {computer.operatingSystem}</div>
                    )}
                    {computer.notes && (
                      <div className="pt-2 text-muted-foreground">{computer.notes}</div>
                    )}
                    <div className="pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tickets/new?customer=${id}&computer=${computer.id}`}>
                          <Ticket className="mr-2 h-3 w-3" />
                          Ticket erstellen
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Edit Computer Dialog */}
          <Dialog open={!!editingComputer} onOpenChange={(open) => !open && setEditingComputer(null)}>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleEditComputer}>
                <DialogHeader>
                  <DialogTitle>Geraet bearbeiten</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pc-name">Name *</Label>
                      <Input id="edit-pc-name" name="name" defaultValue={editingComputer?.name} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pc-type">Typ</Label>
                      <Select name="type" defaultValue={editingComputer?.type || ''}>
                        <SelectTrigger id="edit-pc-type">
                          <SelectValue placeholder="Typ waehlen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Desktop">Desktop</SelectItem>
                          <SelectItem value="Laptop">Laptop</SelectItem>
                          <SelectItem value="Server">Server</SelectItem>
                          <SelectItem value="Drucker">Drucker</SelectItem>
                          <SelectItem value="Router">Router</SelectItem>
                          <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pc-manufacturer">Hersteller</Label>
                      <Input id="edit-pc-manufacturer" name="manufacturer" defaultValue={editingComputer?.manufacturer || ''} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pc-model">Modell</Label>
                      <Input id="edit-pc-model" name="model" defaultValue={editingComputer?.model || ''} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-pc-operatingSystem">Betriebssystem</Label>
                    <Input id="edit-pc-operatingSystem" name="operatingSystem" defaultValue={editingComputer?.operatingSystem || ''} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-pc-notes">Notizen</Label>
                    <Textarea id="edit-pc-notes" name="notes" rows={3} defaultValue={editingComputer?.notes || ''} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingComputer(null)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">Speichern</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/tickets/new?customer=${id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Neues Ticket
              </Link>
            </Button>
          </div>
          
          {customer.tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Keine Tickets</h3>
                <p className="text-muted-foreground">Erstellen Sie das erste Ticket fuer diesen Kunden</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {customer.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{ticket.ticketNumber}: {ticket.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(ticket.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          ticket.priority === 'URGENT' ? 'destructive' :
                          ticket.priority === 'HIGH' ? 'default' : 'secondary'
                        }>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline">{ticket.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="sales" className="space-y-6">
          {/* Domains */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Domains ({customer.domains?.length ?? 0})
              </h3>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/sales/domains/new?customer=${id}`}>
                  <Plus className="mr-2 h-3 w-3" />
                  Domain hinzufuegen
                </Link>
              </Button>
            </div>
            {!customer.domains?.length ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Globe className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Keine Domains vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {customer.domains.map((domain) => {
                      const isExpiringSoon = domain.expiryDate && new Date(domain.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      const isExpired = domain.expiryDate && new Date(domain.expiryDate) < new Date()
                      return (
                        <div key={domain.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{domain.domainName}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                                {domain.registrar && <span>{domain.registrar}</span>}
                                {domain.expiryDate && (
                                  <span className={isExpired ? 'text-destructive font-medium' : isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                                    Ablauf: {format(new Date(domain.expiryDate), 'dd.MM.yyyy', { locale: de })}
                                  </span>
                                )}
                                {domain.billingCycle && <span>{domain.billingCycle}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            {domain.sellPrice != null && (
                              <span className="text-sm font-medium flex items-center gap-0.5">
                                <Euro className="h-3 w-3" />
                                {Number(domain.sellPrice).toFixed(2)}
                              </span>
                            )}
                            <Badge variant={
                              isExpired ? 'destructive' :
                              domain.status === 'active' ? 'default' :
                              domain.status === 'expired' ? 'destructive' : 'secondary'
                            }>
                              {isExpired ? 'Abgelaufen' :
                               domain.status === 'active' ? 'Aktiv' :
                               domain.status === 'transferred' ? 'Transferiert' : domain.status}
                            </Badge>
                            {domain.autoRenew && (
                              <Badge variant="outline" className="text-xs">
                                <CalendarClock className="mr-1 h-3 w-3" />
                                Auto
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Services */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Services ({customer.services?.length ?? 0})
              </h3>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/sales/services/new?customer=${id}`}>
                  <Plus className="mr-2 h-3 w-3" />
                  Service hinzufuegen
                </Link>
              </Button>
            </div>
            {!customer.services?.length ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Keine Services vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {customer.services.map((service) => {
                      const isRenewingSoon = service.renewalDate && new Date(service.renewalDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      return (
                        <div key={service.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{service.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                                {service.type && <span>{service.type}</span>}
                                {service.renewalDate && (
                                  <span className={isRenewingSoon ? 'text-amber-600 font-medium' : ''}>
                                    Verlaengerung: {format(new Date(service.renewalDate), 'dd.MM.yyyy', { locale: de })}
                                  </span>
                                )}
                                {service.billingCycle && <span>{service.billingCycle}</span>}
                              </div>
                              {service.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            {service.sellPrice != null && (
                              <span className="text-sm font-medium flex items-center gap-0.5">
                                <Euro className="h-3 w-3" />
                                {Number(service.sellPrice).toFixed(2)}
                              </span>
                            )}
                            <Badge variant={
                              service.status === 'active' ? 'default' :
                              service.status === 'paused' ? 'secondary' : 'outline'
                            }>
                              {service.status === 'active' ? 'Aktiv' :
                               service.status === 'paused' ? 'Pausiert' :
                               service.status === 'cancelled' ? 'Gekuendigt' : service.status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Kunde bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-company">Firma</Label>
                <Input id="edit-company" name="company" defaultValue={customer.company || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstName">Vorname *</Label>
                  <Input id="edit-firstName" name="firstName" defaultValue={customer.firstName} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastName">Nachname *</Label>
                  <Input id="edit-lastName" name="lastName" defaultValue={customer.lastName} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-Mail</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={customer.email || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input id="edit-phone" name="phone" defaultValue={customer.phone || ''} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-mobile">Mobil</Label>
                <Input id="edit-mobile" name="mobile" defaultValue={customer.mobile || ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-street">Strasse</Label>
                <Input id="edit-street" name="street" defaultValue={customer.street || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-zipCode">PLZ</Label>
                  <Input id="edit-zipCode" name="zipCode" defaultValue={customer.zipCode || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">Stadt</Label>
                  <Input id="edit-city" name="city" defaultValue={customer.city || ''} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-country">Land</Label>
                <Input id="edit-country" name="country" defaultValue={customer.country || ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notizen</Label>
                <Textarea id="edit-notes" name="notes" rows={3} defaultValue={customer.notes || ''} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Spinner className="mr-2 h-4 w-4" />}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
