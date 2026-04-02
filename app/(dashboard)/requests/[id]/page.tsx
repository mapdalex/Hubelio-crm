'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  Check, 
  X, 
  Edit, 
  Trash2,
  FileText,
  CalendarCheck,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'

type RequestDetail = {
  id: string
  requestNumber: string
  type: string
  status: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  approvalComment: string | null
  requester: {
    id: string
    name: string
    email: string
  }
  approvedBy: {
    id: string
    name: string
  } | null
  calendarEvent: {
    id: string
    title: string
    startDate: string
    endDate: string
    calendar: {
      id: string
      name: string
      color: string
    }
  } | null
}

const typeLabels: Record<string, string> = {
  VACATION: 'Urlaub',
  SPECIAL_LEAVE: 'Sonderurlaub',
  MEETING: 'Meeting',
  HOME_OFFICE: 'Home Office',
  BUSINESS_TRIP: 'Dienstreise',
  TRAINING: 'Weiterbildung',
  OTHER: 'Sonstiges',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Ausstehend',
  APPROVED: 'Genehmigt',
  REJECTED: 'Abgelehnt',
  CANCELLED: 'Storniert',
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user, companyRole } = useAuth()
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')

  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || 
    companyRole === 'MANAGER' || companyRole === 'OWNER' || companyRole === 'ADMIN'
  const isOwner = request?.requester.id === user?.id
  const canApprove = isManager && request?.status === 'PENDING' && !isOwner
  const canCancel = isOwner && request?.status === 'PENDING'
  const canDelete = (isOwner && request?.status === 'PENDING') || isManager

  useEffect(() => {
    loadRequest()
  }, [resolvedParams.id])

  const loadRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}`)
      if (!res.ok) {
        throw new Error('Request not found')
      }
      const data = await res.json()
      setRequest(data.request)
    } catch (error) {
      console.error('Error loading request:', error)
      toast.error('Antrag nicht gefunden')
      router.push('/requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          approvalComment: approvalComment || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Fehler bei der Bearbeitung')
      }

      const data = await res.json()
      setRequest(data.request)
      setApprovalComment('')
      toast.success(status === 'APPROVED' ? 'Antrag genehmigt' : 'Antrag abgelehnt')
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Bearbeitung')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (!res.ok) {
        throw new Error('Fehler beim Stornieren')
      }

      const data = await res.json()
      setRequest(data.request)
      toast.success('Antrag storniert')
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error('Fehler beim Stornieren')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/requests/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Fehler beim Loeschen')
      }

      toast.success('Antrag geloescht')
      router.push('/requests')
    } catch (error) {
      console.error('Error deleting request:', error)
      toast.error('Fehler beim Loeschen')
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary'
      case 'APPROVED': return 'default'
      case 'REJECTED': return 'destructive'
      case 'CANCELLED': return 'outline'
      default: return 'outline'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'VACATION': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      case 'SPECIAL_LEAVE': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
      case 'MEETING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'HOME_OFFICE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'BUSINESS_TRIP': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'TRAINING': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/requests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{request.requestNumber}</h1>
              <Badge variant={getStatusVariant(request.status)}>
                {request.status === 'APPROVED' && <Check className="mr-1 h-3 w-3" />}
                {request.status === 'REJECTED' && <X className="mr-1 h-3 w-3" />}
                {statusLabels[request.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{request.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
              <X className="mr-2 h-4 w-4" />
              Stornieren
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Antrag loeschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rueckgaengig gemacht werden. Der Antrag wird permanent geloescht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Loeschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Antragsdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(request.type)}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {typeLabels[request.type]}
                </span>
              </div>

              {request.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Beschreibung</h4>
                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                </div>
              )}

              {(request.startDate || request.endDate) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Zeitraum</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {request.startDate && format(new Date(request.startDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    {request.endDate && request.startDate !== request.endDate && (
                      <>
                        <span className="text-muted-foreground">bis</span>
                        {format(new Date(request.endDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
                      </>
                    )}
                  </div>
                </div>
              )}

              {request.calendarEvent && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarCheck className="h-4 w-4 text-emerald-600" />
                    <span>Im Kalender eingetragen: {request.calendarEvent.calendar.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {request.status !== 'PENDING' && request.approvedBy && (
            <Card>
              <CardHeader>
                <CardTitle>Bearbeitung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${request.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    {request.status === 'APPROVED' ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {request.status === 'APPROVED' ? 'Genehmigt' : request.status === 'REJECTED' ? 'Abgelehnt' : 'Storniert'} von {request.approvedBy.name}
                    </p>
                    {request.approvedAt && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.approvedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    )}
                  </div>
                </div>
                {request.approvalComment && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p className="text-sm">{request.approvalComment}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canApprove && (
            <Card>
              <CardHeader>
                <CardTitle>Antrag bearbeiten</CardTitle>
                <CardDescription>
                  Genehmigen oder lehnen Sie diesen Antrag ab
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Kommentar (optional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Fuegen Sie einen Kommentar hinzu..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApproval('APPROVED')}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Genehmigen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleApproval('REJECTED')}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Ablehnen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Antragsteller</h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{request.requester.name}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">{request.requester.email}</p>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Erstellt am</h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(request.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </span>
                </div>
              </div>

              {request.updatedAt !== request.createdAt && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Zuletzt aktualisiert</h4>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(request.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
