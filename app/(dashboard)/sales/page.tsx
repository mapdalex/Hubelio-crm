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
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  FileText,
  CreditCard,
  ArrowRight,
  Calendar,
  Receipt,
} from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'

async function SalesDashboardStats() {
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
  if (!session.accessibleModules?.includes('SALES') && !session.accessibleModules?.includes('CORE')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Sales-Modul.</p>
      </div>
    )
  }
  
  const now = new Date()
  const monthStart = startOfMonth(now)
  const nextMonthEnd = endOfMonth(addDays(now, 30))
  const thirtyDaysFromNow = addDays(now, 30)
  
  const [
    serviceCount,
    activeServiceCount,
    servicesRenewalSoon,
    recentServices,
    revenueData,
  ] = await Promise.all([
    db.service.count(),
    db.service.count({ where: { status: 'active' } }),
    db.service.findMany({
      where: {
        renewalDate: { gte: monthStart, lte: nextMonthEnd },
        status: 'active',
      },
      include: { customer: true },
      orderBy: { renewalDate: 'asc' },
      take: 10,
    }),
    db.service.findMany({
      where: { status: 'active' },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.service.aggregate({
      where: { status: 'active' },
      _sum: { sellPrice: true, costPrice: true },
    }),
  ])

  const monthlyRevenue = revenueData._sum.sellPrice?.toNumber() || 0
  const monthlyCosts = revenueData._sum.costPrice?.toNumber() || 0
  const monthlyProfit = monthlyRevenue - monthlyCosts

  // Group services by billing cycle
  const billingCycleStats = await db.service.groupBy({
    by: ['billingCycle'],
    where: { status: 'active' },
    _count: { id: true },
  })
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktive Services</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeServiceCount}</div>
            <p className="text-xs text-muted-foreground">
              von {serviceCount} gesamt
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monatlicher Umsatz</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyRevenue.toLocaleString('de-DE')} EUR</div>
            <p className="text-xs text-muted-foreground">
              Aktive Vertraege
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gewinn</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{monthlyProfit.toLocaleString('de-DE')} EUR</div>
            <p className="text-xs text-muted-foreground">
              Umsatz - Kosten
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zur Verrechnung</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesRenewalSoon.length}</div>
            <p className="text-xs text-muted-foreground">
              naechste 30 Tage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/sales/services">
            <CardContent className="flex items-center gap-3 pt-6">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Services</p>
                <p className="text-xs text-muted-foreground">Verwalten</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </CardContent>
          </Link>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Angebote</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Rechnungen</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Zahlungen</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Services to Renew */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Services zur Verrechnung
            </CardTitle>
            <CardDescription>Erneuerung in den naechsten 30 Tagen</CardDescription>
          </CardHeader>
          <CardContent>
            {servicesRenewalSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Services zur Verrechnung</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {servicesRenewalSoon.map((service) => (
                  <div key={service.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.customer.companyName || `${service.customer.firstName} ${service.customer.lastName}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {service.sellPrice ? `${service.sellPrice} EUR` : '-'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {service.renewalDate ? format(service.renewalDate, 'dd.MM.yyyy', { locale: de }) : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Cycle Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-500" />
              Abrechnungszyklen
            </CardTitle>
            <CardDescription>Verteilung aktiver Services</CardDescription>
          </CardHeader>
          <CardContent>
            {billingCycleStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Daten vorhanden</p>
            ) : (
              <div className="space-y-3">
                {billingCycleStats.map((cycle) => (
                  <div key={cycle.billingCycle || 'other'} className="flex items-center justify-between">
                    <span className="text-sm">
                      {cycle.billingCycle === 'monthly' && 'Monatlich'}
                      {cycle.billingCycle === 'yearly' && 'Jaehrlich'}
                      {cycle.billingCycle === 'quarterly' && 'Quartalsweise'}
                      {!['monthly', 'yearly', 'quarterly'].includes(cycle.billingCycle || '') && (cycle.billingCycle || 'Sonstige')}
                    </span>
                    <Badge variant="outline">{cycle._count.id} Services</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neueste Services</CardTitle>
          <CardDescription>Zuletzt hinzugefuegt</CardDescription>
        </CardHeader>
        <CardContent>
          {recentServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Services vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.customer.companyName || `${service.customer.firstName} ${service.customer.lastName}`}
                      {service.type && ` - ${service.type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.status === 'active' ? 'default' : 'outline'}>
                      {service.status === 'active' ? 'Aktiv' : service.status}
                    </Badge>
                    {service.sellPrice && (
                      <Badge variant="secondary">{service.sellPrice.toString()} EUR</Badge>
                    )}
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

export default function SalesDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verkauf</h1>
        <p className="text-muted-foreground">Uebersicht ueber Services, Umsatz und Verrechnung</p>
      </div>
      
      <Suspense fallback={<SalesDashboardSkeleton />}>
        <SalesDashboardStats />
      </Suspense>
    </div>
  )
}

function SalesDashboardSkeleton() {
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
