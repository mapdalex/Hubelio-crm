import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Mail, 
  Users,
  MousePointer,
  Eye,
  ArrowRight,
  Plus,
  BarChart3,
  Send,
  FileText,
  Target,
  Zap,
} from 'lucide-react'

async function CampaignsDashboardStats() {
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
  if (!session.accessibleModules?.includes('CAMPAIGNS')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Kampagnen-Modul.</p>
      </div>
    )
  }

  // Placeholder data - no real campaign system yet
  const stats = {
    activeCampaigns: 0,
    draftCampaigns: 0,
    totalSubscribers: 0,
    emailsSentThisMonth: 0,
    averageOpenRate: 0,
    averageClickRate: 0,
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Kampagnen</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">Laufende Kampagnen</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abonnenten</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers.toLocaleString('de-DE')}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">E-Mails gesendet</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsSentThisMonth.toLocaleString('de-DE')}</div>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Oeffnungsrate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Durchschnitt</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">Neue Kampagne</p>
            <Button variant="outline" size="sm">
              Erstellen
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Vorlagen</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Listen</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Berichte</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointer className="h-4 w-4 text-blue-500" />
              Klickrate
            </CardTitle>
            <CardDescription>Durchschnittliche Click-Through-Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-muted-foreground">{stats.averageClickRate}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                Starten Sie eine Kampagne um Statistiken zu sehen.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-green-500" />
              Conversions
            </CardTitle>
            <CardDescription>Erfolgreiche Konvertierungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-muted-foreground">0</div>
              <p className="text-sm text-muted-foreground mt-2">
                Starten Sie eine Kampagne um Conversions zu tracken.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demnachst verfuegbar</CardTitle>
          <CardDescription>Geplante Funktionen fuer das Kampagnen-Modul</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">E-Mail Builder</p>
                <p className="text-xs text-muted-foreground">Drag & Drop Editor fuer E-Mails</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Automation</p>
                <p className="text-xs text-muted-foreground">Automatisierte E-Mail Workflows</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">A/B Testing</p>
                <p className="text-xs text-muted-foreground">Optimieren Sie Ihre Kampagnen</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CampaignsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kampagnen</h1>
        <p className="text-muted-foreground">E-Mail Marketing und Newsletter</p>
      </div>
      
      <Suspense fallback={<CampaignsDashboardSkeleton />}>
        <CampaignsDashboardStats />
      </Suspense>
    </div>
  )
}

function CampaignsDashboardSkeleton() {
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
