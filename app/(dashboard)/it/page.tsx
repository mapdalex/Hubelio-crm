import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Monitor, Globe, AlertCircle, Clock, Server, Laptop, Shield, Ticket, ArrowRight } from 'lucide-react'
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
    openTickets,
    urgentTickets,
    inProgressTickets,
    recentTickets,
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
    // Ticket Stats
    db.ticket.count({ where: { status: 'OPEN' } }),
    db.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    db.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    db.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } },
      include: { 
        customer: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
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
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default'
      case 'IN_PROGRESS': return 'secondary'
      case 'WAITING': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Offen'
      case 'IN_PROGRESS': return 'In Bearbeitung'
      case 'WAITING': return 'Wartend'
      default: return status
    }
  }
  
  return (
    <div className="space-y-6">
      {/* IT Support Tickets Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              IT Support Tickets
            </CardTitle>
            <CardDescription>Aktuelle Tickets und Support-Anfragen</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/it/tickets">
              Alle anzeigen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTickets}</p>
                <p className="text-xs text-muted-foreground">Offene Tickets</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentTickets}</p>
                <p className="text-xs text-muted-foreground">Dringend</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTickets}</p>
                <p className="text-xs text-muted-foreground">In Bearbeitung</p>
              </div>
            </div>
          </div>
          
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine offenen Tickets</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/tickets/${ticket.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {ticket.ticketNumber}: {ticket.subject}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.customer?.companyName || (ticket.customer ? `${ticket.customer.firstName} ${ticket.customer.lastName}` : 'Kein Kunde')}
                      {ticket.assignedTo && ` - ${ticket.assignedTo.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={getPriorityColor(ticket.priority) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant={getStatusColor(ticket.status) as 'default' | 'secondary' | 'outline'}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
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
