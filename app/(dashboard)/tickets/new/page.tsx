'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'

type Customer = {
  id: string
  customerNumber: string
  company: string | null
  firstName: string
  lastName: string
}

type Computer = {
  id: string
  name: string
  type: string | null
}

type Employee = {
  id: string
  name: string
}

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [computers, setComputers] = useState<Computer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(searchParams.get('customer') || '')
  
  const isEmployee = user && ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(user.role)
  
  const loadCustomers = useCallback(async () => {
    if (!isEmployee) return
    try {
      const res = await fetch('/api/customers?limit=100')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }, [isEmployee])
  
  const loadComputers = useCallback(async (customerId: string) => {
    if (!customerId) {
      setComputers([])
      return
    }
    try {
      const res = await fetch(`/api/customers/${customerId}`)
      const data = await res.json()
      setComputers(data.customer?.computers || [])
    } catch (error) {
      console.error('Error loading computers:', error)
    }
  }, [])
  
  const loadEmployees = useCallback(async () => {
    if (!isEmployee) return
    try {
      const res = await fetch('/api/users?role=employee')
      const data = await res.json()
      setEmployees(data.users || [])
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }, [isEmployee])
  
  useEffect(() => {
    loadCustomers()
    loadEmployees()
  }, [loadCustomers, loadEmployees])
  
  useEffect(() => {
    if (selectedCustomerId) {
      loadComputers(selectedCustomerId)
    }
  }, [selectedCustomerId, loadComputers])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      subject: formData.get('subject'),
      description: formData.get('description'),
      priority: formData.get('priority') || 'MEDIUM',
      customerId: formData.get('customerId') || null,
      computerId: formData.get('computerId') || null,
      assignedToId: formData.get('assignedToId') || null,
    }
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        const result = await res.json()
        router.push(`/tickets/${result.ticket.id}`)
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neues Ticket</h1>
          <p className="text-muted-foreground">Erstellen Sie eine neue Support-Anfrage</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Ticket-Details</CardTitle>
          <CardDescription>
            Beschreiben Sie Ihr Anliegen so detailliert wie moeglich
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Betreff *</Label>
              <Input 
                id="subject" 
                name="subject" 
                required 
                placeholder="Kurze Beschreibung des Problems"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung *</Label>
              <Textarea 
                id="description" 
                name="description" 
                required 
                rows={6}
                placeholder="Detaillierte Beschreibung..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioritaet</Label>
                <Select name="priority" defaultValue="MEDIUM">
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Niedrig</SelectItem>
                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                    <SelectItem value="HIGH">Hoch</SelectItem>
                    <SelectItem value="URGENT">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {isEmployee && (
                <div className="grid gap-2">
                  <Label htmlFor="assignedToId">Zuweisen an</Label>
                  <Select name="assignedToId">
                    <SelectTrigger id="assignedToId">
                      <SelectValue placeholder="Mitarbeiter waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {isEmployee && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Kunde</Label>
                  <Select 
                    name="customerId" 
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder="Kunde waehlen (optional)" />
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
                
                {computers.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="computerId">PC/Geraet</Label>
                    <Select name="computerId" defaultValue={searchParams.get('computer') || undefined}>
                      <SelectTrigger id="computerId">
                        <SelectValue placeholder="PC waehlen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {computers.map((computer) => (
                          <SelectItem key={computer.id} value={computer.id}>
                            {computer.name} {computer.type && `(${computer.type})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/tickets">Abbrechen</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                Ticket erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>}>
      <NewTicketForm />
    </Suspense>
  )
}
