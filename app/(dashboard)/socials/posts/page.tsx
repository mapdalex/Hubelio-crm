'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { 
  Plus, 
  Loader2, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Send, 
  Eye,
  Calendar,
  Clock,
  Image as ImageIcon,
  Video,
  Filter,
} from 'lucide-react'
import { PlatformIcon, getPlatformName } from '@/components/social/platform-icon'
import { StatusBadge } from '@/components/social/status-badge'
import { cn } from '@/lib/utils'

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
  createdAt: string
  createdBy: { id: string; name: string }
  media: { id: string; type: string; url: string }[]
  targetAccounts: {
    id: string
    status: string
    account: {
      id: string
      platform: SocialPlatform
      accountName: string
    }
  }[]
}

const statusOptions: { value: SocialPostStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Alle Status' },
  { value: 'DRAFT', label: 'Entwuerfe' },
  { value: 'REVIEW', label: 'In Pruefung' },
  { value: 'APPROVED', label: 'Freigegeben' },
  { value: 'SCHEDULED', label: 'Geplant' },
  { value: 'PUBLISHED', label: 'Veroeffentlicht' },
  { value: 'FAILED', label: 'Fehlgeschlagen' },
  { value: 'REJECTED', label: 'Abgelehnt' },
]

export default function SocialPostsPage() {
  const { companyId, companyRole } = useAuth()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | 'ALL'>('ALL')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  const canManage = ['ADMIN', 'MANAGER', 'OWNER'].includes(companyRole || '')

  useEffect(() => {
    loadPosts()
  }, [companyId, statusFilter, pagination.page])

  const loadPosts = async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      })
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/social/posts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Fehler beim Laden der Posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!companyId || !confirm('Post wirklich loeschen?')) return

    try {
      const res = await fetch(`/api/social/posts/${postId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId))
        toast.success('Post geloescht')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    }
  }

  const handleSubmitForReview = async (postId: string) => {
    if (!companyId) return

    try {
      const res = await fetch(`/api/social/posts/${postId}/submit`, {
        method: 'POST',
      })
      
      if (res.ok) {
        toast.success('Zur Pruefung eingereicht')
        loadPosts()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Fehler beim Einreichen')
      }
    } catch (error) {
      toast.error('Fehler beim Einreichen')
    }
  }

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.targetAccounts.some(a => a.account.accountName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media Posts</h1>
          <p className="text-muted-foreground">Verwalte und plane deine Social Media Beitraege</p>
        </div>
        <Link href="/socials/posts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Posts durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SocialPostStatus | 'ALL')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'ALL' 
                ? 'Keine Posts gefunden' 
                : 'Noch keine Posts erstellt'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <Link href="/socials/posts/new">
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Ersten Post erstellen
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map(post => (
            <Card key={post.id} className="overflow-hidden">
              <div className="flex">
                {/* Media Preview */}
                {post.media.length > 0 && (
                  <div className="relative w-32 h-32 flex-shrink-0 bg-muted">
                    {post.media[0].type === 'video' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Video className="h-8 w-8 text-white" />
                      </div>
                    ) : (
                      <img 
                        src={post.media[0].url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    {post.media.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        +{post.media.length - 1}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status & Type */}
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={post.status} size="sm" />
                        <span className="text-xs text-muted-foreground capitalize">
                          {post.postType.toLowerCase()}
                        </span>
                      </div>

                      {/* Content Preview */}
                      <p className="text-sm line-clamp-2 mb-2">
                        {post.content}
                      </p>

                      {/* Accounts */}
                      <div className="flex items-center gap-2 mb-2">
                        {post.targetAccounts.map(ta => (
                          <div key={ta.id} className="flex items-center gap-1">
                            <PlatformIcon platform={ta.account.platform} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              @{ta.account.accountName}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {post.scheduledFor && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(post.scheduledFor)}
                          </span>
                        )}
                        <span>
                          Erstellt von {post.createdBy.name}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/socials/posts/${post.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Anzeigen
                          </Link>
                        </DropdownMenuItem>
                        {post.status === 'DRAFT' && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/socials/posts/${post.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Bearbeiten
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSubmitForReview(post.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Zur Pruefung einreichen
                            </DropdownMenuItem>
                          </>
                        )}
                        {post.status === 'REJECTED' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/socials/posts/${post.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Ueberarbeiten
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {['DRAFT', 'REJECTED'].includes(post.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          >
            Zurueck
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Seite {pagination.page} von {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          >
            Weiter
          </Button>
        </div>
      )}
    </main>
  )
}
