import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Ticket, Globe, ShoppingCart, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'

async function DashboardStats() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(session.role)
  
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
  
  // Mitarbeiter/Admin Dashboard
  const [
    customerCount,
    openTickets,
    domainsExpiringSoon,
    servicesRenewalSoon,
    recentTickets,
  ] = await Promise.all([
    db.customer.count({ where: { isActive: true } }),
    db.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } } }),
    db.domain.findMany({
      where: {
        expiryDate: {
          gte: new Date(),
          lte: addDays(new Date(), 30),
        },
        status: 'active',
      },
      include: { customer: true },
      orderBy: { expiryDate: 'asc' },
      take: 5,
    }),
    db.service.findMany({
      where: {
        renewalDate: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(addDays(new Date(), 30)),
        },
        status: 'active',
      },
      include: { customer: true },
      orderBy: { renewalDate: 'asc' },
      take: 5,
    }),
    db.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { customer: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
            <Link href="/customers" className="text-xs text-muted-foreground hover:underline">
              Alle anzeigen
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <Link href="/tickets" className="text-xs text-muted-foreground hover:underline">
              Alle anzeigen
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Domains (30 Tage)</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domainsExpiringSoon.length}</div>
            <Link href="/sales/domains" className="text-xs text-muted-foreground hover:underline">
              Zur Erneuerung
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Services (Monat)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesRenewalSoon.length}</div>
            <Link href="/sales/services" className="text-xs text-muted-foreground hover:underline">
              Zur Verrechnung
            </Link>
          </CardContent>
        </Card>
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
                        href={`/sales/domains/${domain.id}`}
                        className="font-medium hover:underline"
                      >
                        {domain.domainName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {domain.customer.company || `${domain.customer.firstName} ${domain.customer.lastName}`}
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
        
        {/* Services renewal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-blue-500" />
              Services zur Verrechnung
            </CardTitle>
            <CardDescription>Erneuerung diesen/naechsten Monat</CardDescription>
          </CardHeader>
          <CardContent>
            {servicesRenewalSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Services zur Verrechnung</p>
            ) : (
              <div className="space-y-3">
                {servicesRenewalSoon.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div>
                      <Link 
                        href={`/sales/services/${service.id}`}
                        className="font-medium hover:underline"
                      >
                        {service.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {service.customer.company || `${service.customer.firstName} ${service.customer.lastName}`}
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
      </div>
      
      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktuelle Tickets</CardTitle>
          <CardDescription>Neueste offene und in Bearbeitung</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Tickets</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <Link 
                      href={`/tickets/${ticket.id}`}
                      className="font-medium hover:underline"
                    >
                      {ticket.ticketNumber}: {ticket.subject}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {ticket.customer?.company || ticket.customer?.firstName || 'Kein Kunde'} 
                      {ticket.assignedTo && ` - ${ticket.assignedTo.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        ticket.priority === 'URGENT' ? 'destructive' :
                        ticket.priority === 'HIGH' ? 'default' :
                        'secondary'
                      }
                    >
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline">
                      {ticket.status}
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen im CRM System</p>
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
