import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Users, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Ticket,
  ShoppingCart,
  Globe,
  Monitor,
  FileDown,
  Calendar,
  PieChart,
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'

async function AnalyticsDashboardStats() {
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
  if (!session.accessibleModules?.includes('ANALYTICS')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Analytics-Modul.</p>
      </div>
    )
  }
  
  const companyId = session.companyId
  const whereCompany = companyId ? { companyId } : {}
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  
  // Gather analytics from all modules
  const [
    // Customer stats
    totalCustomers,
    newCustomersThisMonth,
    newCustomersLastMonth,
    // Service/Revenue stats
    totalServices,
    activeServices,
    totalRevenue,
    // Ticket stats
    totalTickets,
    resolvedTicketsThisMonth,
    resolvedTicketsLastMonth,
    // IT stats
    totalComputers,
    totalDomains,
  ] = await Promise.all([
    db.customer.count({ where: { isActive: true, ...whereCompany } }),
    db.customer.count({ where: { createdAt: { gte: thisMonthStart }, ...whereCompany } }),
    db.customer.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...whereCompany } }),
    db.service.count(),
    db.service.count({ where: { status: 'active' } }),
    db.service.aggregate({ where: { status: 'active' }, _sum: { sellPrice: true } }),
    db.ticket.count({ where: whereCompany }),
    db.ticket.count({ where: { status: 'RESOLVED', closedAt: { gte: thisMonthStart }, ...whereCompany } }),
    db.ticket.count({ where: { status: 'RESOLVED', closedAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...whereCompany } }),
    db.computer.count({ where: { isActive: true } }),
    db.domain.count({ where: { status: 'active' } }),
  ])

  const revenue = totalRevenue._sum.sellPrice?.toNumber() || 0
  
  // Calculate growth rates
  const customerGrowth = newCustomersLastMonth > 0 
    ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth * 100).toFixed(1)
    : newCustomersThisMonth > 0 ? '100' : '0'
  
  const ticketGrowth = resolvedTicketsLastMonth > 0
    ? ((resolvedTicketsThisMonth - resolvedTicketsLastMonth) / resolvedTicketsLastMonth * 100).toFixed(1)
    : resolvedTicketsThisMonth > 0 ? '100' : '0'
  
  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gesamtkunden</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <div className="flex items-center text-xs">
              {Number(customerGrowth) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-600">+{customerGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-600">{customerGrowth}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monatlicher Umsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenue.toLocaleString('de-DE')} EUR</div>
            <p className="text-xs text-muted-foreground">
              aus {activeServices} aktiven Services
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets geloest</CardTitle>
            <Ticket className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTicketsThisMonth}</div>
            <div className="flex items-center text-xs">
              {Number(ticketGrowth) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-600">+{ticketGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-600">{ticketGrowth}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs. letzter Monat</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">IT Assets</CardTitle>
            <Monitor className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComputers + totalDomains}</div>
            <p className="text-xs text-muted-foreground">
              {totalComputers} Geraete, {totalDomains} Domains
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-500" />
              Kunden (CORE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gesamt</span>
              <span className="font-medium">{totalCustomers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Neu (Monat)</span>
              <span className="font-medium">{newCustomersThisMonth}</span>
            </div>
            <Link href="/customers" className="text-xs text-primary hover:underline inline-block">
              Kunden anzeigen
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              Verkauf (SALES)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Services</span>
              <span className="font-medium">{activeServices} / {totalServices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Umsatz</span>
              <span className="font-medium">{revenue.toLocaleString('de-DE')} EUR</span>
            </div>
            <Link href="/sales" className="text-xs text-primary hover:underline inline-block">
              Sales Dashboard
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-purple-500" />
              Tickets (MESSAGE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gesamt</span>
              <span className="font-medium">{totalTickets}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Geloest (Monat)</span>
              <span className="font-medium">{resolvedTicketsThisMonth}</span>
            </div>
            <Link href="/messages" className="text-xs text-primary hover:underline inline-block">
              Nachrichten Dashboard
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4 text-orange-500" />
              IT-Verwaltung (IT)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Geraete</span>
              <span className="font-medium">{totalComputers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Domains</span>
              <span className="font-medium">{totalDomains}</span>
            </div>
            <Link href="/it" className="text-xs text-primary hover:underline inline-block">
              IT Dashboard
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-pink-500" />
              Social Media (SOCIALS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Modul noch nicht aktiv</p>
            </div>
            <Link href="/socials" className="text-xs text-primary hover:underline inline-block">
              Social Dashboard
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Kampagnen (CAMPAIGNS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Modul noch nicht aktiv</p>
            </div>
            <Link href="/campaigns" className="text-xs text-primary hover:underline inline-block">
              Kampagnen Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Export & Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Berichte & Export</CardTitle>
          <CardDescription>Daten exportieren und Berichte erstellen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="justify-start" disabled>
              <FileDown className="h-4 w-4 mr-2" />
              Kunden exportieren
              <Badge variant="secondary" className="ml-auto">Demnachst</Badge>
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <FileDown className="h-4 w-4 mr-2" />
              Umsatzbericht
              <Badge variant="secondary" className="ml-auto">Demnachst</Badge>
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <Calendar className="h-4 w-4 mr-2" />
              Zeitraum-Analyse
              <Badge variant="secondary" className="ml-auto">Demnachst</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Auswertungen und KPIs ueber alle Module</p>
      </div>
      
      <Suspense fallback={<AnalyticsDashboardSkeleton />}>
        <AnalyticsDashboardStats />
      </Suspense>
    </div>
  )
}

function AnalyticsDashboardSkeleton() {
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
