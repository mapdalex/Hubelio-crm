'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Send, 
  Paperclip, 
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailAccount {
  id: string
  name: string
  displayName: string | null
  username: string
}

interface Email {
  id: string
  fromAddress: string
  fromName: string | null
  subject: string
  bodyText: string | null
}

interface EmailComposerProps {
  accountId: string
  accounts: EmailAccount[]
  replyTo?: Email | null
  onClose: () => void
  onSent: () => void
}

export function EmailComposer({
  accountId: initialAccountId,
  accounts,
  replyTo,
  onClose,
  onSent,
}: EmailComposerProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const [formData, setFormData] = useState({
    accountId: initialAccountId,
    to: replyTo?.fromAddress || '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: replyTo 
      ? `\n\n-------- Urspruengliche Nachricht --------\nVon: ${replyTo.fromName || replyTo.fromAddress}\n\n${replyTo.bodyText || ''}`
      : '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.to || !formData.subject) {
      toast.error('Bitte Empfaenger und Betreff angeben')
      return
    }
    
    setIsSending(true)
    
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          to: formData.to,
          subject: formData.subject,
          text: formData.body,
          replyToEmailId: replyTo?.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send email')
      }
      
      onSent()
    } catch (error) {
      toast.error('Fehler beim Senden der E-Mail')
    } finally {
      setIsSending(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === formData.accountId)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "max-w-2xl p-0 gap-0",
          isMinimized && "h-auto"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-medium">
            {replyTo ? 'Antworten' : 'Neue E-Mail'}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {!isMinimized && (
          <form onSubmit={handleSubmit} className="flex flex-col h-[500px]">
            {/* From Account */}
            <div className="px-4 py-2 border-b flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-12">Von:</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
              >
                <SelectTrigger className="flex-1 h-8 border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.displayName || account.name} ({account.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* To */}
            <div className="px-4 py-2 border-b flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-12">An:</Label>
              <Input
                type="email"
                value={formData.to}
                onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="empfaenger@example.com"
                className="flex-1 h-8 border-0 shadow-none focus-visible:ring-0"
                required
              />
            </div>
            
            {/* Subject */}
            <div className="px-4 py-2 border-b flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-12">Betreff:</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Betreff eingeben..."
                className="flex-1 h-8 border-0 shadow-none focus-visible:ring-0"
                required
              />
            </div>
            
            {/* Body */}
            <div className="flex-1 p-4">
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Nachricht schreiben..."
                className="h-full resize-none border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            
            {/* Footer Actions */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" disabled>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Verwerfen
                </Button>
                <Button type="submit" disabled={isSending}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Senden...' : 'Senden'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
