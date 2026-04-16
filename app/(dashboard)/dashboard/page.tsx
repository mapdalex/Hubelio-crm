import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Ticket, 
  Globe, 
  ShoppingCart, 
  AlertCircle, 
  Clock,
  Monitor,
  MessageSquare,
  TrendingUp,
  Share2,
  BarChart3,
  DollarSign,
  Shield,
  CheckCircle,
  ArrowRight,
  Key,
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import type { ModuleId } from '@prisma/client'

// Widget components for each module
function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  moduleId, 
  href, 
  children 
}: { 
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  moduleId: string
  href: string
  children: React.ReactNode
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{moduleId}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <Link 
          href={href} 
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Dashboard oeffnen
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  )
}

async function DashboardStats() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG', 'SUPERADMIN'].includes(session.role)
  const accessibleModules = session.accessibleModules || ['CORE']
  const companyId = session.companyId
  const whereCompany = companyId ? { companyId } : {}
  
  if (!isEmployee) {
    // Kunden-Dashboard
    const customer = await db.customer.findFirst({
      where: { userId: session.userId },
    })
    
    if (!customer) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Kein Kundenprofil gefunden.</p>
        </div>
      )
    }
    
    const openTickets = await db.ticket.count({
      where: {
        customerId: customer.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
      },
    })
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <Link href="/tickets" className="text-xs text-muted-foreground hover:underline">
              Alle Tickets anzeigen
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const now = new Date()
  const thirtyDaysFromNow = addDays(now, 30)
  const monthStart = startOfMonth(now)
  const nextMonthEnd = endOfMonth(addDays(now, 30))
  
  // Gather stats for each accessible module
  const moduleStats: Record<string, unknown> = {}
  
  // CORE Module Stats (always accessible)
  if (accessibleModules.includes('CORE' as ModuleId)) {
    const customerCount = await db.customer.count({ 
      where: { isActive: true, ...whereCompany } 
    })
    moduleStats.CORE = { customerCount }
  }
  
  // IT Module Stats
  if (accessibleModules.includes('IT' as ModuleId)) {
    const [computerCount, domainCount, domainsExpiringSoon, warrantyExpiringSoon] = await Promise.all([
      db.computer.count({ where: { isActive: true } }),
      db.domain.count({ where: { status: 'active' } }),
      db.domain.count({
        where: {
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
          status: 'active',
        },
      }),
      db.computer.count({
        where: {
          warrantyUntil: { gte: now, lte: thirtyDaysFromNow },
          isActive: true,
        },
      }),
    ])
    moduleStats.IT = { computerCount, domainCount, domainsExpiringSoon, warrantyExpiringSoon }
  }
  
  // SALES Module Stats
  if (accessibleModules.includes('SALES' as ModuleId)) {
    const [activeServiceCount, servicesRenewalSoon, revenueData] = await Promise.all([
      db.service.count({ where: { status: 'active' } }),
      db.service.count({
        where: {
          renewalDate: { gte: monthStart, lte: nextMonthEnd },
          status: 'active',
        },
      }),
      db.service.aggregate({
        where: { status: 'active' },
        _sum: { sellPrice: true },
      }),
    ])
    moduleStats.SALES = { 
      activeServiceCount, 
      servicesRenewalSoon,
      monthlyRevenue: revenueData._sum.sellPrice?.toNumber() || 0,
    }
  }
  
  // MESSAGE Module Stats
  if (accessibleModules.includes('MESSAGE' as ModuleId)) {
    const [openTickets, inProgressTickets, urgentTickets, resolvedThisMonth] = await Promise.all([
      db.ticket.count({ where: { status: 'OPEN', ...whereCompany } }),
      db.ticket.count({ where: { status: 'IN_PROGRESS', ...whereCompany } }),
      db.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] }, ...whereCompany } }),
      db.ticket.count({ where: { status: 'RESOLVED', closedAt: { gte: monthStart }, ...whereCompany } }),
    ])
    moduleStats.MESSAGE = { 
      openTickets, 
      inProgressTickets, 
      urgentTickets, 
      resolvedThisMonth,
      totalActive: openTickets + inProgressTickets,
    }
  }
  
  // SOCIALS Module Stats (placeholder)
  if (accessibleModules.includes('SOCIALS' as ModuleId)) {
    moduleStats.SOCIALS = { connectedAccounts: 0, scheduledPosts: 0 }
  }
  
  // CAMPAIGNS Module Stats (placeholder)
  if (accessibleModules.includes('CAMPAIGNS' as ModuleId)) {
    moduleStats.CAMPAIGNS = { activeCampaigns: 0, emailsSent: 0 }
  }
  
  // RENT Module Stats
  if (accessibleModules.includes('RENT' as ModuleId)) {
    const whereRent = companyId ? { companyId } : {}
    const [totalItems, activeBookings, pendingBookingsCount] = await Promise.all([
      db.rentalItem.count({ where: { isActive: true, ...whereRent } }),
      db.rentalBooking.count({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
          ...whereRent,
        },
      }),
      db.rentalBooking.count({
        where: { 
          status: 'PENDING',
          OR: [
            { startDate: { gt: now } },
            { endDate: { lt: now } },
          ],
          ...whereRent,
        },
      }),
    ])
    moduleStats.RENT = {
      totalItems,
      availableItems: Math.max(0, totalItems - activeBookings),
      rentedItems: activeBookings,
      pendingBookings: pendingBookingsCount,
    }
  }

  // ANALYTICS - aggregate stats
  if (accessibleModules.includes('ANALYTICS' as ModuleId)) {
    moduleStats.ANALYTICS = {
      totalCustomers: (moduleStats.CORE as { customerCount: number })?.customerCount || 0,
      totalRevenue: (moduleStats.SALES as { monthlyRevenue: number })?.monthlyRevenue || 0,
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Willkommen zurueck, {session.name}!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sie haben Zugriff auf {accessibleModules.length} Module.
              </p>
            </div>
            <div className="flex gap-2">
              {accessibleModules.map(moduleId => (
                <Badge key={moduleId} variant="outline">{moduleId}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Module Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* CORE Module */}
        {accessibleModules.includes('CORE' as ModuleId) && moduleStats.CORE && (
          <ModuleCard 
            title="Kunden" 
            description="Kundenverwaltung" 
            icon={Users} 
            moduleId="CORE"
            href="/customers"
          >
            <div className="text-3xl font-bold">
              {(moduleStats.CORE as { customerCount: number }).customerCount}
            </div>
            <p className="text-sm text-muted-foreground">Aktive Kunden</p>
          </ModuleCard>
        )}
        
        {/* MESSAGE Module */}
        {accessibleModules.includes('MESSAGE' as ModuleId) && moduleStats.MESSAGE && (
          <ModuleCard 
            title="Nachrichten" 
            description="Tickets & Kommunikation" 
            icon={MessageSquare} 
            moduleId="MESSAGE"
            href="/messages"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.MESSAGE as { totalActive: number }).totalActive}
                </div>
                <p className="text-xs text-muted-foreground">Aktive Tickets</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {(moduleStats.MESSAGE as { resolvedThisMonth: number }).resolvedThisMonth}
                </div>
                <p className="text-xs text-muted-foreground">Geloest</p>
              </div>
            </div>
            {(moduleStats.MESSAGE as { urgentTickets: number }).urgentTickets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-destructive font-medium">
                  {(moduleStats.MESSAGE as { urgentTickets: number }).urgentTickets} dringend
                </span>
              </div>
            )}
          </ModuleCard>
        )}
        
        {/* IT Module */}
        {accessibleModules.includes('IT' as ModuleId) && moduleStats.IT && (
          <ModuleCard 
            title="IT-Verwaltung" 
            description="Geraete & Domains" 
            icon={Monitor} 
            moduleId="IT"
            href="/it"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.IT as { computerCount: number }).computerCount}
                </div>
                <p className="text-xs text-muted-foreground">Geraete</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.IT as { domainCount: number }).domainCount}
                </div>
                <p className="text-xs text-muted-foreground">Domains</p>
              </div>
            </div>
            {((moduleStats.IT as { domainsExpiringSoon: number }).domainsExpiringSoon > 0 || 
              (moduleStats.IT as { warrantyExpiringSoon: number }).warrantyExpiringSoon > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">
                  {(moduleStats.IT as { domainsExpiringSoon: number }).domainsExpiringSoon} Domain(s), 
                  {(moduleStats.IT as { warrantyExpiringSoon: number }).warrantyExpiringSoon} Garantie(n)
                </span>
              </div>
            )}
          </ModuleCard>
        )}
        
        {/* SALES Module */}
        {accessibleModules.includes('SALES' as ModuleId) && moduleStats.SALES && (
          <ModuleCard 
            title="Verkauf" 
            description="Services & Umsatz" 
            icon={ShoppingCart} 
            moduleId="SALES"
            href="/sales"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.SALES as { activeServiceCount: number }).activeServiceCount}
                </div>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
              <div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {(moduleStats.SALES as { monthlyRevenue: number }).monthlyRevenue.toLocaleString('de-DE')}
                </div>
                <p className="text-xs text-muted-foreground">Umsatz</p>
              </div>
            </div>
            {(moduleStats.SALES as { servicesRenewalSoon: number }).servicesRenewalSoon > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">
                  {(moduleStats.SALES as { servicesRenewalSoon: number }).servicesRenewalSoon} zur Verrechnung
                </span>
              </div>
            )}
          </ModuleCard>
        )}
        
        {/* SOCIALS Module */}
        {accessibleModules.includes('SOCIALS' as ModuleId) && moduleStats.SOCIALS && (
          <ModuleCard 
            title="Social Media" 
            description="Accounts & Posts" 
            icon={Share2} 
            moduleId="SOCIALS"
            href="/socials"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.SOCIALS as { connectedAccounts: number }).connectedAccounts}
                </div>
                <p className="text-xs text-muted-foreground">Accounts</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.SOCIALS as { scheduledPosts: number }).scheduledPosts}
                </div>
                <p className="text-xs text-muted-foreground">Geplant</p>
              </div>
            </div>
          </ModuleCard>
        )}
        
        {/* CAMPAIGNS Module */}
        {accessibleModules.includes('CAMPAIGNS' as ModuleId) && moduleStats.CAMPAIGNS && (
          <ModuleCard 
            title="Kampagnen" 
            description="E-Mail Marketing" 
            icon={TrendingUp} 
            moduleId="CAMPAIGNS"
            href="/campaigns"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.CAMPAIGNS as { activeCampaigns: number }).activeCampaigns}
                </div>
                <p className="text-xs text-muted-foreground">Aktiv</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.CAMPAIGNS as { emailsSent: number }).emailsSent}
                </div>
                <p className="text-xs text-muted-foreground">Gesendet</p>
              </div>
            </div>
          </ModuleCard>
        )}
        
        {/* RENT Module */}
        {accessibleModules.includes('RENT' as ModuleId) && moduleStats.RENT && (
          <ModuleCard
            title="Vermietung"
            description="Objekte & Buchungen"
            icon={Key}
            moduleId="RENT"
            href="/rental"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {(moduleStats.RENT as { availableItems: number }).availableItems}
                </div>
                <p className="text-xs text-muted-foreground">Frei zur Vermietung</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {(moduleStats.RENT as { rentedItems: number }).rentedItems}
                </div>
                <p className="text-xs text-muted-foreground">Vermietet</p>
              </div>
            </div>
            {(moduleStats.RENT as { pendingBookings: number }).pendingBookings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">
                  {(moduleStats.RENT as { pendingBookings: number }).pendingBookings} ausstehend
                </span>
              </div>
            )}
          </ModuleCard>
        )}

        {/* ANALYTICS Module */}
        {accessibleModules.includes('ANALYTICS' as ModuleId) && moduleStats.ANALYTICS && (
          <ModuleCard 
            title="Analytics" 
            description="Auswertungen & KPIs" 
            icon={BarChart3} 
            moduleId="ANALYTICS"
            href="/analytics"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {(moduleStats.ANALYTICS as { totalCustomers: number }).totalCustomers}
                </div>
                <p className="text-xs text-muted-foreground">Kunden</p>
              </div>
              <div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {(moduleStats.ANALYTICS as { totalRevenue: number }).totalRevenue.toLocaleString('de-DE')}
                </div>
                <p className="text-xs text-muted-foreground">Umsatz</p>
              </div>
            </div>
          </ModuleCard>
        )}
      </div>
      
      {/* No modules message */}
      {accessibleModules.length <= 1 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Weitere Module verfuegbar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Kontaktieren Sie Ihren Administrator um weitere Module freizuschalten.
            </p>
            <Link href="/settings/modules">
              <Badge variant="outline" className="cursor-pointer">
                Module verwalten
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Uebersicht ueber alle zugaenglichen Module</p>
      </div>
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="h-24 animate-pulse bg-muted/50" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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
