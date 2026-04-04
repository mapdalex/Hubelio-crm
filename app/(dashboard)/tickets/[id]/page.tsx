'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Clock, MessageSquare, Monitor, Send, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'

type Comment = {
  id: string
  content: string
  isInternal: boolean
  createdAt: string
  user: {
    id: string
    name: string
    role: string
  }
}

type Ticket = {
  id: string
  ticketNumber: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
  closedAt: string | null
  customer: {
    id: string
    customerNumber: string
    company: string | null
    firstName: string
    lastName: string
  } | null
  computer: {
    id: string
    name: string
    type: string | null
  } | null
  createdBy: {
    id: string
    name: string
  }
  assignedTo: {
    id: string
    name: string
  } | null
  comments: Comment[]
}

const statusLabels: Record<string, string> = {
  OPEN: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  WAITING: 'Wartend',
  RESOLVED: 'Geloest',
  CLOSED: 'Geschlossen',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, companyRole, companyId, isSuperAdmin } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  
  // Check if user can manage tickets (company members or superadmin)
  const isEmployee = isSuperAdmin() || (companyRole && ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(companyRole))
  
  const loadTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`)
      const data = await res.json()
      setTicket(data.ticket)
    } catch (error) {
      console.error('Error loading ticket:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])
  
  const loadEmployees = useCallback(async () => {
    if (!isEmployee || !companyId) return
    try {
      // Load only members of this company
      const res = await fetch(`/api/companies/${companyId}`)
      const data = await res.json()
      const members = (data.company?.companyUsers || []).map((cu: { user: { id: string; name: string } }) => ({
        id: cu.user.id,
        name: cu.user.name,
      }))
      setEmployees(members)
    } catch (error) {
      console.error('Error loading company members:', error)
    }
  }, [isEmployee, companyId])
  
  useEffect(() => {
    loadTicket()
    loadEmployees()
  }, [loadTicket, loadEmployees])
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          isInternal,
        }),
      })
      
      if (res.ok) {
        setNewComment('')
        setIsInternal(false)
        loadTicket()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleStatusChange = async (status: string) => {
    try {
      await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      loadTicket()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }
  
  const handleAssigneeChange = async (assignedToId: string) => {
    try {
      await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      })
      loadTicket()
    } catch (error) {
      console.error('Error updating assignee:', error)
    }
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  
  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Ticket nicht gefunden</h2>
        <Button asChild className="mt-4">
          <Link href="/tickets">Zurueck zur Liste</Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{ticket.ticketNumber}</h1>
            <Badge variant={ticket.priority === 'URGENT' ? 'destructive' : ticket.priority === 'HIGH' ? 'default' : 'secondary'}>
              {priorityLabels[ticket.priority]}
            </Badge>
            <Badge variant="outline">
              {statusLabels[ticket.status]}
            </Badge>
          </div>
          <p className="text-lg">{ticket.subject}</p>
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>
          
          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Kommentare ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Noch keine Kommentare
                </p>
              ) : (
                <div className="space-y-4">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className={`flex gap-3 ${comment.isInternal ? 'bg-muted/50 p-3 rounded-lg' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.user.name}</span>
                          {comment.isInternal && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="mr-1 h-2 w-2" />
                              Intern
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Separator />
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="space-y-3">
                <Textarea
                  placeholder="Kommentar schreiben..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  {isEmployee && (
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="isInternal" 
                        checked={isInternal}
                        onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                      />
                      <Label htmlFor="isInternal" className="text-sm text-muted-foreground">
                        Interne Notiz (nur fuer Mitarbeiter sichtbar)
                      </Label>
                    </div>
                  )}
                  <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                    {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                    Senden
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status & Priority */}
          {isEmployee && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Offen</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                      <SelectItem value="WAITING">Wartend</SelectItem>
                      <SelectItem value="RESOLVED">Geloest</SelectItem>
                      <SelectItem value="CLOSED">Geschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Zugewiesen an</Label>
                  <Select 
                    value={ticket.assignedTo?.id || '_none'} 
                    onValueChange={(value) => handleAssigneeChange(value === '_none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nicht zugewiesen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nicht zugewiesen</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Erstellt</div>
                  <div>{format(new Date(ticket.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                </div>
              </div>
              
              {ticket.closedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Geschlossen</div>
                    <div>{format(new Date(ticket.closedAt), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">Erstellt von</div>
                  <div>{ticket.createdBy.name}</div>
                </div>
              </div>
              
              {ticket.customer && (
                <div>
                  <div className="text-muted-foreground">Kunde</div>
                  <Link href={`/customers/${ticket.customer.id}`} className="hover:underline">
                    {ticket.customer.company || `${ticket.customer.firstName} ${ticket.customer.lastName}`}
                  </Link>
                </div>
              )}
              
              {ticket.computer && (
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">PC/Geraet</div>
                    <div>{ticket.computer.name}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
