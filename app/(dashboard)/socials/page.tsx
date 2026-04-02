import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Twitter,
  Linkedin,
  Plus,
  BarChart3,
} from 'lucide-react'

async function SocialsDashboardStats() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG', 'SUPERADMIN'].includes(session.role)
  
  if (!isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Zugriff verweigert.</p>
      </div>
    )
  }

  // Check module access
  if (!session.accessibleModules?.includes('SOCIALS')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Social Media-Modul.</p>
      </div>
    )
  }

  // Placeholder data - no real social media integration yet
  const stats = {
    connectedAccounts: 0,
    scheduledPosts: 0,
    publishedThisMonth: 0,
    totalReach: 0,
    totalEngagement: 0,
    followers: 0,
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verbundene Accounts</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectedAccounts}</div>
            <p className="text-xs text-muted-foreground">Social Media Konten</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Geplante Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">In der Warteschlange</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Veroeffentlicht</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Follower</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followers.toLocaleString('de-DE')}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <p className="font-medium">Instagram</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Verbinden
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Facebook className="h-6 w-6 text-white" />
            </div>
            <p className="font-medium">Facebook</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Verbinden
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center">
              <Twitter className="h-6 w-6 text-white" />
            </div>
            <p className="font-medium">X (Twitter)</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Verbinden
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-700 flex items-center justify-center">
              <Linkedin className="h-6 w-6 text-white" />
            </div>
            <p className="font-medium">LinkedIn</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Verbinden
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-red-500" />
              Engagement
            </CardTitle>
            <CardDescription>Interaktionen mit Ihren Posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Verbinden Sie Social Media Accounts um Engagement-Statistiken zu sehen.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-blue-500" />
              Reichweite
            </CardTitle>
            <CardDescription>Wie viele Menschen Ihre Posts sehen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Verbinden Sie Social Media Accounts um Reichweiten-Statistiken zu sehen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demnachst verfuegbar</CardTitle>
          <CardDescription>Geplante Funktionen fuer das Social Media Modul</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Content Kalender</p>
                <p className="text-xs text-muted-foreground">Planen und veroeffentlichen Sie Posts</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Analytics Dashboard</p>
                <p className="text-xs text-muted-foreground">Detaillierte Auswertungen</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Unified Inbox</p>
                <p className="text-xs text-muted-foreground">Alle Nachrichten an einem Ort</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SocialsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Social Media Praesenz</p>
      </div>
      
      <Suspense fallback={<SocialsDashboardSkeleton />}>
        <SocialsDashboardStats />
      </Suspense>
    </div>
  )
}

function SocialsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
