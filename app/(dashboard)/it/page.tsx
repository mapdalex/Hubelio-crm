import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Globe, AlertCircle, Clock, Server, Laptop, Shield } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { de } from 'date-fns/locale'

async function ITDashboardStats() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(session.role)
  
  if (!isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Zugriff verweigert.</p>
      </div>
    )
  }
  
  const now = new Date()
  const thirtyDaysFromNow = addDays(now, 30)
  
  const [
    computerCount,
    activeComputerCount,
    domainCount,
    domainsExpiringSoon,
    warrantyExpiringSoon,
    recentComputers,
  ] = await Promise.all([
    db.computer.count(),
    db.computer.count({ where: { isActive: true } }),
    db.domain.count({ where: { status: 'active' } }),
    db.domain.findMany({
      where: {
        expiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: 'active',
      },
      include: { customer: true },
      orderBy: { expiryDate: 'asc' },
      take: 5,
    }),
    db.computer.findMany({
      where: {
        warrantyUntil: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        isActive: true,
      },
      include: { customer: true },
      orderBy: { warrantyUntil: 'asc' },
      take: 5,
    }),
    db.computer.findMany({
      where: { isActive: true },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])
  
  // Count by type
  const computersByType = await db.computer.groupBy({
    by: ['type'],
    where: { isActive: true },
    _count: { id: true },
  })
  
  const typeStats = computersByType.reduce((acc, item) => {
    acc[item.type || 'Sonstige'] = item._count.id
    return acc
  }, {} as Record<string, number>)
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Geraete gesamt</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{computerCount}</div>
            <p className="text-xs text-muted-foreground">
              {activeComputerCount} aktiv
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domainCount}</div>
            <Link href="/it/domains" className="text-xs text-muted-foreground hover:underline">
              Alle anzeigen
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Domains (30 Tage)</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domainsExpiringSoon.length}</div>
            <p className="text-xs text-muted-foreground">
              Zur Erneuerung
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Garantie (30 Tage)</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warrantyExpiringSoon.length}</div>
            <p className="text-xs text-muted-foreground">
              Laufen ab
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Device Type Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Object.entries(typeStats).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="flex items-center gap-3 pt-6">
              {type === 'Desktop' && <Monitor className="h-8 w-8 text-muted-foreground" />}
              {type === 'Laptop' && <Laptop className="h-8 w-8 text-muted-foreground" />}
              {type === 'Server' && <Server className="h-8 w-8 text-muted-foreground" />}
              {!['Desktop', 'Laptop', 'Server'].includes(type) && <Monitor className="h-8 w-8 text-muted-foreground" />}
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{type}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Domains expiring soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Domains zur Erneuerung
            </CardTitle>
            <CardDescription>Ablauf in den naechsten 30 Tagen</CardDescription>
          </CardHeader>
          <CardContent>
            {domainsExpiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Domains zur Erneuerung</p>
            ) : (
              <div className="space-y-3">
                {domainsExpiringSoon.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between">
                    <div>
                      <Link 
                        href={`/it/domains`}
                        className="font-medium hover:underline"
                      >
                        {domain.domainName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {domain.customer.companyName || `${domain.customer.firstName} ${domain.customer.lastName}`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {domain.expiryDate ? format(domain.expiryDate, 'dd.MM.yyyy', { locale: de }) : '-'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Warranty expiring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-blue-500" />
              Garantie laeuft ab
            </CardTitle>
            <CardDescription>In den naechsten 30 Tagen</CardDescription>
          </CardHeader>
          <CardContent>
            {warrantyExpiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Garantien laufen ab</p>
            ) : (
              <div className="space-y-3">
                {warrantyExpiringSoon.map((computer) => (
                  <div key={computer.id} className="flex items-center justify-between">
                    <div>
                      <Link 
                        href={`/it/computers`}
                        className="font-medium hover:underline"
                      >
                        {computer.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {computer.customer.companyName || `${computer.customer.firstName} ${computer.customer.lastName}`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {computer.warrantyUntil ? format(computer.warrantyUntil, 'dd.MM.yyyy', { locale: de }) : '-'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Computers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zuletzt hinzugefuegte Geraete</CardTitle>
          <CardDescription>Die neuesten Eintraege</CardDescription>
        </CardHeader>
        <CardContent>
          {recentComputers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Geraete vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentComputers.map((computer) => (
                <div key={computer.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <Link 
                      href={`/it/computers`}
                      className="font-medium hover:underline"
                    >
                      {computer.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {computer.customer.companyName || `${computer.customer.firstName} ${computer.customer.lastName}`}
                      {computer.type && ` - ${computer.type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {computer.operatingSystem && (
                      <Badge variant="secondary">{computer.operatingSystem}</Badge>
                    )}
                    <Badge variant={computer.isActive ? 'default' : 'outline'}>
                      {computer.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
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

export default function ITDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IT-Verwaltung</h1>
        <p className="text-muted-foreground">Uebersicht ueber alle Geraete und Domains</p>
      </div>
      
      <Suspense fallback={<ITDashboardSkeleton />}>
        <ITDashboardStats />
      </Suspense>
    </div>
  )
}

function ITDashboardSkeleton() {
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
