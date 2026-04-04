'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Share2, 
  Users, 
  Calendar,
  TrendingUp,
  Heart,
  MessageCircle,
  Eye,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  Plus,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  profileImage?: string
  isActive: boolean
}

interface SocialStats {
  connectedAccounts: number
  scheduledPosts: number
  publishedThisMonth: number
  totalReach: number
  totalEngagement: number
  followers: number
  accounts: SocialAccount[]
  recentPosts: Array<{
    id: string
    content: string
    status: string
    scheduledFor?: string
  }>
}

export default function SocialsDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!session?.user?.companyId) {
    return null
  }

  const { data: stats, isLoading } = useSWR<SocialStats>(
    mounted ? `/api/social/stats` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (!mounted || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Social Media Präsenz</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Social Media Präsenz</p>
        </div>
        <Link href="/socials/posts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Post
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verbundene Accounts</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.connectedAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">Social Media Konten</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Geplante Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduledPosts || 0}</div>
            <p className="text-xs text-muted-foreground">In der Warteschlange</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Veröffentlicht</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.publishedThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Follower</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.followers || 0).toLocaleString('de-DE')}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Section */}
      {stats?.connectedAccounts === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Verbundene Accounts</CardTitle>
            <CardDescription>Verbinden Sie Ihre Social Media Accounts zum Verwalten von Posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Keine Accounts verbunden</p>
              <Link href="/settings/social">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Account verbinden
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Verbundene Accounts</CardTitle>
            <CardDescription>{stats?.connectedAccounts} Accounts verbunden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats?.accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  {account.profileImage && (
                    <img src={account.profileImage} alt={account.accountName} className="h-10 w-10 rounded-full" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{account.accountName}</p>
                    <p className="text-sm text-muted-foreground">{account.platform}</p>
                  </div>
                  {account.isActive && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-700">Aktiv</Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/settings/social">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Account hinzufügen
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aktuelle Posts</CardTitle>
              <CardDescription>Ihre letzten erstellten Posts</CardDescription>
            </div>
            <Link href="/socials/posts">
              <Button variant="outline" size="sm">
                Alle anzeigen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!stats?.recentPosts || stats.recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Keine Posts erstellt</p>
              <Link href="/socials/posts/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ersten Post erstellen
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div>
                      <p className="font-medium truncate">{post.content.substring(0, 50)}</p>
                      <p className="text-sm text-muted-foreground">
                        {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString('de-DE') : 'Kein Datum'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === 'PUBLISHED' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {post.status === 'SCHEDULED' && <Clock className="h-4 w-4 text-blue-500" />}
                    {post.status === 'REVIEW' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    <Badge variant="outline">{post.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
