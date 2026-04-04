'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  ChevronDown,
  ChevronUp,
  Reply,
  Forward,
  Paperclip,
  Ticket,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
  ticket?: {
    id: string
    ticketNumber: string
    status: string
  } | null
}

interface EmailThreadProps {
  email: Email
  onReply: (email: Email) => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function EmailThread({ email, onReply }: EmailThreadProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set([email.id]))

  // Fetch full email data including thread
  const { data } = useSWR(`/api/emails/${email.id}`, fetcher, {
    fallbackData: { email, thread: [email] },
  })

  const threadEmails: Email[] = data?.thread || [email]
  const primaryEmail = data?.email || email

  const toggleExpand = (emailId: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
      }
      return next
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  return (
    <div className="divide-y">
      {/* Subject Header */}
      <div className="p-4">
        <h2 className="text-lg font-semibold">{primaryEmail.subject || '(Kein Betreff)'}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {primaryEmail.ticket && (
            <Link href={`/tickets/${primaryEmail.ticket.id}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                <Ticket className="h-3 w-3 mr-1" />
                {primaryEmail.ticket.ticketNumber}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Badge>
            </Link>
          )}
          <Badge variant="secondary">
            {threadEmails.length} {threadEmails.length === 1 ? 'Nachricht' : 'Nachrichten'}
          </Badge>
        </div>
      </div>

      {/* Thread Messages */}
      {threadEmails.map((threadEmail, index) => {
        const isExpanded = expandedEmails.has(threadEmail.id)
        const isLast = index === threadEmails.length - 1
        
        return (
          <div 
            key={threadEmail.id} 
            className={cn(
              'transition-colors',
              isExpanded ? 'bg-background' : 'bg-muted/30'
            )}
          >
            {/* Message Header */}
            <button
              onClick={() => toggleExpand(threadEmail.id)}
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(threadEmail.fromName, threadEmail.fromAddress)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {threadEmail.fromName || threadEmail.fromAddress}
                    </span>
                    {threadEmail.folder === 'SENT' && (
                      <Badge variant="outline" className="text-xs">Gesendet</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {threadEmail.receivedAt 
                        ? format(new Date(threadEmail.receivedAt), 'dd. MMM yyyy, HH:mm', { locale: de })
                        : '-'
                      }
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {!isExpanded && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {threadEmail.snippet || threadEmail.bodyText?.substring(0, 100)}
                  </p>
                )}
                
                {isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1">
                    An: {threadEmail.toAddress}
                    {threadEmail.cc && `, CC: ${threadEmail.cc}`}
                  </p>
                )}
              </div>
            </button>

            {/* Message Body */}
            {isExpanded && (
              <div className="px-4 pb-4">
                {threadEmail.hasAttachments && (
                  <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Anhaenge vorhanden</span>
                  </div>
                )}
                
                {/* Email Body */}
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {threadEmail.bodyHtml ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: threadEmail.bodyHtml }}
                      className="email-content"
                    />
                  ) : threadEmail.bodyText ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {threadEmail.bodyText}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground italic">Kein Inhalt</p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onReply(threadEmail)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Antworten
                  </Button>
                  <Button variant="outline" size="sm">
                    <Forward className="h-4 w-4 mr-2" />
                    Weiterleiten
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
