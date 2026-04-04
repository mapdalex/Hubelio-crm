'use client'

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Inbox, 
  Send, 
  Star, 
  Trash2, 
  RefreshCw,
  Search,
  MailOpen,
  Paperclip,
  Reply,
  Forward,
  MoreHorizontal,
  ChevronLeft,
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmailComposer } from './email-composer'
import { EmailThread } from './email-thread'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
}

interface User {
  id: string
  name: string
}

interface EmailAccount {
  id: string
  name: string
  displayName: string | null
  username: string
  accountType: string
  total: number
  unread: number
}

interface Email {
  id: string
  messageId: string
  threadId: string | null
  folder: string
  fromAddress: string
  fromName: string | null
  toAddress: string
  toName: string | null
  cc: string | null
  subject: string
  snippet: string | null
  bodyText: string | null
  bodyHtml: string | null
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  receivedAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
  emailSettings: {
    id: string
    name: string
    displayName: string | null
  }
  ticket: {
    id: string
    ticketNumber: string
    status: string
  } | null
}

interface EmailInboxProps {
  accounts: EmailAccount[]
  initialEmails: Email[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

type Folder = 'INBOX' | 'SENT' | 'STARRED' | 'TRASH'

export function EmailInbox({ accounts, initialEmails }: EmailInboxProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(
    accounts.length === 1 ? accounts[0].id : null
  )
  const [selectedFolder, setSelectedFolder] = useState<Folder>('INBOX')
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [replyTo, setReplyTo] = useState<Email | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Ticket creation dialog state
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [ticketEmail, setTicketEmail] = useState<Email | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    customerId: '',
    assignedToId: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
  })

  // Fetch emails for selected account/folder
  const { data, error, isLoading } = useSWR(
    selectedAccount 
      ? `/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}` 
      : null,
    fetcher,
    {
      fallbackData: selectedAccount ? { emails: initialEmails.filter(e => e.emailSettings.id === selectedAccount), unreadCount: 0 } : undefined,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  const emails: Email[] = data?.emails || (selectedAccount ? [] : initialEmails)
  const unreadCount = data?.unreadCount || 0

  // Sync emails
  const handleSync = useCallback(async () => {
    if (!selectedAccount) return
    
    setIsSyncing(true)
    try {
      const response = await fetch(`/api/emails/sync?accountId=${selectedAccount}`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Sync failed')
      
      const result = await response.json()
      toast.success(`${result.result.synced} neue E-Mails synchronisiert`)
      
      // Refresh email list
      mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
    } catch (error) {
      toast.error('Fehler beim Synchronisieren')
    } finally {
      setIsSyncing(false)
    }
  }, [selectedAccount, selectedFolder])

  // Toggle star
  const handleToggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !currentStarred }),
      })
      
      mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
    } catch (error) {
      toast.error('Fehler beim Markieren')
    }
  }

  // Mark as read/unread
  const handleMarkRead = async (emailId: string, isRead: boolean) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      })
      
      mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
    } catch (error) {
      toast.error('Fehler beim Aktualisieren')
    }
  }

  // Delete email
  const handleDelete = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      })
      
      toast.success('E-Mail geloescht')
      setSelectedEmail(null)
      mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    }
  }

  // Open ticket creation dialog
  const openTicketDialog = async (email: Email) => {
    setTicketEmail(email)
    setTicketForm({
      customerId: '',
      assignedToId: '',
      priority: 'MEDIUM',
      subject: email.subject,
      description: email.bodyText || email.snippet || '',
    })
    setIsTicketDialogOpen(true)
    
    // Load customers and users
    try {
      const [customersRes, usersRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/users'),
      ])
      
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.customers || [])
        
        // Try to match customer by email
        const matchedCustomer = (data.customers || []).find(
          (c: Customer) => c.email?.toLowerCase() === email.fromAddress.toLowerCase()
        )
        if (matchedCustomer) {
          setTicketForm(prev => ({ ...prev, customerId: matchedCustomer.id }))
        }
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading data for ticket dialog:', error)
    }
  }

  // Create ticket from email
  const handleCreateTicket = async () => {
    if (!ticketEmail) return
    
    setIsCreatingTicket(true)
    try {
      const response = await fetch(`/api/emails/${ticketEmail.id}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: ticketForm.customerId && ticketForm.customerId !== '_none' ? ticketForm.customerId : null,
          assignedToId: ticketForm.assignedToId && ticketForm.assignedToId !== '_none' ? ticketForm.assignedToId : null,
          priority: ticketForm.priority,
          subject: ticketForm.subject,
          description: ticketForm.description,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }
      
      const data = await response.json()
      toast.success(`Ticket ${data.ticket.ticketNumber} erstellt`)
      setIsTicketDialogOpen(false)
      setTicketEmail(null)
      mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen des Tickets')
    } finally {
      setIsCreatingTicket(false)
    }
  }

  // Reply to email
  const handleReply = (email: Email) => {
    setReplyTo(email)
    setIsComposing(true)
  }

  // Filter emails by search
  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.fromAddress.toLowerCase().includes(query) ||
      (email.fromName?.toLowerCase().includes(query) ?? false) ||
      (email.snippet?.toLowerCase().includes(query) ?? false)
    )
  })

  const selectedEmailData = selectedEmail 
    ? emails.find(e => e.id === selectedEmail) 
    : null

  // Render folders
  const folders: { id: Folder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'INBOX', label: 'Posteingang', icon: Inbox },
    { id: 'SENT', label: 'Gesendet', icon: Send },
    { id: 'STARRED', label: 'Markiert', icon: Star },
    { id: 'TRASH', label: 'Papierkorb', icon: Trash2 },
  ]

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar - Accounts & Folders */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">E-Mail</CardTitle>
            <Button size="sm" onClick={() => setIsComposing(true)}>
              Verfassen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            {/* Folders */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Ordner</p>
              <div className="space-y-1">
                {folders.map((folder) => {
                  const Icon = folder.icon
                  const isActive = selectedFolder === folder.id
                  return (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolder(folder.id)
                        setSelectedEmail(null)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{folder.label}</span>
                      {folder.id === 'INBOX' && unreadCount > 0 && (
                        <Badge variant={isActive ? 'secondary' : 'default'} className="h-5 px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <Separator className="my-2" />
            
            {/* Email Accounts */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Konten</p>
              <div className="space-y-1">
                {accounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    Keine E-Mail-Konten konfiguriert
                  </p>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccount(account.id)
                        setSelectedEmail(null)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                        selectedAccount === account.id 
                          ? 'bg-muted' 
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="truncate font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.username}</p>
                      </div>
                      {account.unread > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5">
                          {account.unread}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card className="flex-1 min-w-0">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="E-Mails durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleSync}
              disabled={!selectedAccount || isSyncing}
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Inbox className="h-12 w-12 mb-4" />
                <p>Keine E-Mails gefunden</p>
                {!selectedAccount && (
                  <p className="text-sm mt-2">Waehlen Sie ein Konto aus</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email.id)}
                    className={cn(
                      'flex items-start gap-3 p-4 cursor-pointer transition-colors',
                      selectedEmail === email.id ? 'bg-muted' : 'hover:bg-muted/50',
                      !email.isRead && 'bg-primary/5'
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleStar(email.id, email.isStarred)
                      }}
                      className="mt-0.5"
                    >
                      <Star 
                        className={cn(
                          'h-4 w-4',
                          email.isStarred 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground hover:text-yellow-400'
                        )} 
                      />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          'text-sm truncate',
                          !email.isRead && 'font-semibold'
                        )}>
                          {email.fromName || email.fromAddress}
                        </p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {email.receivedAt 
                            ? formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true, locale: de })
                            : '-'
                          }
                        </span>
                      </div>
                      
                      <p className={cn(
                        'text-sm truncate',
                        !email.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}>
                        {email.subject || '(Kein Betreff)'}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {email.snippet}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {email.hasAttachments && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                          {email.ticket && (
                            <Badge variant="outline" className="h-5 text-xs">
                              <Ticket className="h-3 w-3 mr-1" />
                              {email.ticket.ticketNumber}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Email Detail / Thread View */}
      {selectedEmailData && (
        <Card className="w-[500px] flex-shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedEmail(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1" />
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleReply(selectedEmailData)}
              >
                <Reply className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleToggleStar(selectedEmailData.id, selectedEmailData.isStarred)}
              >
                <Star className={cn(
                  'h-4 w-4',
                  selectedEmailData.isStarred && 'fill-yellow-400 text-yellow-400'
                )} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleMarkRead(selectedEmailData.id, !selectedEmailData.isRead)}>
                    {selectedEmailData.isRead ? (
                      <>
                        <MailOpen className="h-4 w-4 mr-2" />
                        Als ungelesen markieren
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Als gelesen markieren
                      </>
                    )}
                  </DropdownMenuItem>
                  {!selectedEmailData.ticket && (
                    <DropdownMenuItem onClick={() => openTicketDialog(selectedEmailData)}>
                      <Ticket className="h-4 w-4 mr-2" />
                      Ticket erstellen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(selectedEmailData.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Loeschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <EmailThread email={selectedEmailData} onReply={handleReply} />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Compose Modal */}
      {isComposing && (
        <EmailComposer
          accountId={selectedAccount || accounts[0]?.id}
          accounts={accounts}
          replyTo={replyTo}
          onClose={() => {
            setIsComposing(false)
            setReplyTo(null)
          }}
          onSent={() => {
            setIsComposing(false)
            setReplyTo(null)
            mutate(`/api/emails?accountId=${selectedAccount}&folder=${selectedFolder}`)
            toast.success('E-Mail gesendet')
          }}
        />
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket aus E-Mail erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein Support-Ticket aus dieser E-Mail
            </DialogDescription>
          </DialogHeader>

          {ticketEmail && (
            <div className="space-y-4">
              {/* Email Info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">Von: {ticketEmail.fromName || ticketEmail.fromAddress}</p>
                <p className="text-xs text-muted-foreground">{ticketEmail.fromAddress}</p>
              </div>

              {/* Customer Selection */}
              <div className="grid gap-2">
                <Label htmlFor="customerId">Kunde</Label>
                <Select 
                  value={ticketForm.customerId} 
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Kein Kunde</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                        {customer.email && ` (${customer.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To */}
              <div className="grid gap-2">
                <Label htmlFor="assignedToId">Zuweisen an</Label>
                <Select 
                  value={ticketForm.assignedToId} 
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, assignedToId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nicht zugewiesen</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioritaet</Label>
                <Select 
                  value={ticketForm.priority} 
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioritaet auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Niedrig</SelectItem>
                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                    <SelectItem value="HIGH">Hoch</SelectItem>
                    <SelectItem value="URGENT">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="grid gap-2">
                <Label htmlFor="subject">Betreff</Label>
                <input
                  id="subject"
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateTicket} disabled={isCreatingTicket}>
              {isCreatingTicket ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Ticket erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
