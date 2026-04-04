'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Loader2, 
  Edit, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Video,
  Image as ImageIcon,
} from 'lucide-react'
import { PlatformIcon, getPlatformName } from '@/components/social/platform-icon'
import { StatusBadge } from '@/components/social/status-badge'

type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN'
type SocialPostStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'REJECTED'
type SocialPostType = 'POST' | 'REEL' | 'STORY' | 'VIDEO' | 'CAROUSEL'

type SocialPost = {
  id: string
  content: string
  postType: SocialPostType
  status: SocialPostStatus
  scheduledFor: string | null
  publishedAt: string | null
  rejectionReason: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; email: string }
  reviewedBy: { id: string; name: string } | null
  approvedBy: { id: string; name: string } | null
  media: { id: string; type: string; url: string; altText: string | null }[]
  targetAccounts: {
    id: string
    status: string
    platformPostId: string | null
    platformUrl: string | null
    errorMessage: string | null
    account: {
      id: string
      platform: SocialPlatform
      accountName: string
      profileUrl: string | null
    }
  }[]
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, companyRole, user } = useAuth()
  const [post, setPost] = useState<SocialPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')

  const canManage = ['ADMIN', 'MANAGER', 'OWNER'].includes(companyRole || '')
  const isCreator = post?.createdBy.id === user?.id

  useEffect(() => {
    loadPost()
  }, [companyId, params.postId])

  const loadPost = async () => {
    if (!companyId || !params.postId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${params.postId}`)
      if (res.ok) {
        const data = await res.json()
        setPost(data.post)
      } else {
        toast.error('Post nicht gefunden')
        router.push('/socials/posts')
      }
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Fehler beim Laden')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!companyId || !post) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}/submit`, {
        method: 'POST',
      })
      
      if (res.ok) {
        toast.success('Zur Pruefung eingereicht')
        loadPost()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler beim Einreichen')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async () => {
    if (!companyId || !post) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      
      if (res.ok) {
        toast.success('Post freigegeben')
        loadPost()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler beim Freigeben')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!companyId || !post || !rejectionReason.trim()) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      
      if (res.ok) {
        toast.success('Post abgelehnt')
        setShowRejectDialog(false)
        setRejectionReason('')
        loadPost()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler beim Ablehnen')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSchedule = async () => {
    if (!companyId || !post || !scheduledFor) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor }),
      })
      
      if (res.ok) {
        toast.success('Post geplant')
        setShowScheduleDialog(false)
        setScheduledFor('')
        loadPost()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler beim Planen')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveAndSchedule = async () => {
    if (!companyId || !post || !scheduledFor) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor }),
      })
      
      if (res.ok) {
        toast.success('Post freigegeben und geplant')
        setShowScheduleDialog(false)
        setScheduledFor('')
        loadPost()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!companyId || !post || !confirm('Post wirklich loeschen?')) return

    setIsProcessing(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/social/posts/${post.id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        toast.success('Post geloescht')
        router.push('/socials/posts')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler')
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!post) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Post nicht gefunden</p>
      </main>
    )
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/socials/posts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Post Details</h1>
              <StatusBadge status={post.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Erstellt am {formatDate(post.createdAt)} von {post.createdBy.name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {post.status === 'DRAFT' && (isCreator || canManage) && (
            <>
              <Link href={`/socials/posts/${post.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </Link>
              <Button onClick={handleSubmitForReview} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Zur Pruefung
              </Button>
            </>
          )}

          {post.status === 'REVIEW' && canManage && (
            <>
              <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={isProcessing}>
                <XCircle className="mr-2 h-4 w-4" />
                Ablehnen
              </Button>
              <Button variant="outline" onClick={() => setShowScheduleDialog(true)} disabled={isProcessing}>
                <Clock className="mr-2 h-4 w-4" />
                Freigeben & Planen
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Freigeben
              </Button>
            </>
          )}

          {post.status === 'APPROVED' && canManage && (
            <Button onClick={() => setShowScheduleDialog(true)} disabled={isProcessing}>
              <Clock className="mr-2 h-4 w-4" />
              Planen
            </Button>
          )}

          {post.status === 'REJECTED' && (isCreator || canManage) && (
            <Link href={`/socials/posts/${post.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Ueberarbeiten
              </Button>
            </Link>
          )}

          {['DRAFT', 'REJECTED'].includes(post.status) && (isCreator || canManage) && (
            <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
              <Trash2 className="mr-2 h-4 w-4" />
              Loeschen
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Card */}
          <Card>
            <CardHeader>
              <CardTitle>Inhalt</CardTitle>
              <CardDescription>
                Typ: {post.postType.toLowerCase()} | {post.content.length} Zeichen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{post.content}</p>
            </CardContent>
          </Card>

          {/* Media */}
          {post.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Medien ({post.media.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {post.media.map((item, index) => (
                    <div 
                      key={item.id}
                      className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      {item.type === 'video' ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Video className="h-8 w-8 text-white" />
                        </div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt={item.altText || ''} 
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason */}
          {post.status === 'REJECTED' && post.rejectionReason && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Ablehnungsgrund</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{post.rejectionReason}</p>
                {post.reviewedBy && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Abgelehnt von {post.reviewedBy.name}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {post.status === 'FAILED' && post.errorMessage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Fehler beim Veroeffentlichen</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{post.errorMessage}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Ziel-Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.targetAccounts.map(ta => (
                <div key={ta.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={ta.account.platform} size="sm" />
                    <div>
                      <p className="text-sm font-medium">@{ta.account.accountName}</p>
                      <p className="text-xs text-muted-foreground">
                        {getPlatformName(ta.account.platform)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ta.status === 'published' && (
                      <>
                        <Badge variant="default" className="bg-green-500">
                          Veroeffentlicht
                        </Badge>
                        {ta.platformUrl && (
                          <a href={ta.platformUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </>
                    )}
                    {ta.status === 'failed' && (
                      <Badge variant="destructive">Fehlgeschlagen</Badge>
                    )}
                    {ta.status === 'pending' && (
                      <Badge variant="secondary">Ausstehend</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Zeitplanung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {post.scheduledFor ? 'Geplant fuer' : 'Nicht geplant'}
                  </p>
                  {post.scheduledFor && (
                    <p className="text-sm text-muted-foreground">
                      {formatDate(post.scheduledFor)}
                    </p>
                  )}
                </div>
              </div>
              {post.publishedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Veroeffentlicht am</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow History */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Erstellt von <strong>{post.createdBy.name}</strong></span>
              </div>
              {post.reviewedBy && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Geprueft von <strong>{post.reviewedBy.name}</strong></span>
                </div>
              )}
              {post.approvedBy && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Freigegeben von <strong>{post.approvedBy.name}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post ablehnen</DialogTitle>
            <DialogDescription>
              Bitte geben Sie einen Grund fuer die Ablehnung an.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Ablehnungsgrund</Label>
              <Textarea
                id="reason"
                placeholder="Grund eingeben..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {post.status === 'REVIEW' ? 'Freigeben & Planen' : 'Post planen'}
            </DialogTitle>
            <DialogDescription>
              Waehlen Sie Datum und Uhrzeit fuer die Veroeffentlichung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Datum & Uhrzeit</Label>
              <input
                type="datetime-local"
                id="scheduledFor"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={post.status === 'REVIEW' ? handleApproveAndSchedule : handleSchedule}
              disabled={!scheduledFor || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {post.status === 'REVIEW' ? 'Freigeben & Planen' : 'Planen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
