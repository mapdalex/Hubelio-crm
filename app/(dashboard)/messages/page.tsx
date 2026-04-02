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
  MessageSquare, 
  Ticket, 
  Mail, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Inbox,
  Send,
  FileEdit,
  Users,
} from 'lucide-react'
import { format, startOfMonth, subDays } from 'date-fns'
import { de } from 'date-fns/locale'

async function MessagesDashboardStats() {
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
  if (!session.accessibleModules?.includes('MESSAGE') && !session.accessibleModules?.includes('CORE')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Nachrichten-Modul.</p>
      </div>
    )
  }
  
  const companyId = session.companyId
  const whereCompany = companyId ? { companyId } : {}
  const now = new Date()
  const monthStart = startOfMonth(now)
  const sevenDaysAgo = subDays(now, 7)
  
  const [
    openTickets,
    inProgressTickets,
    waitingTickets,
    urgentTickets,
    resolvedThisMonth,
    recentTickets,
    ticketsByPriority,
    assigneeStats,
  ] = await Promise.all([
    db.ticket.count({ where: { status: 'OPEN', ...whereCompany } }),
    db.ticket.count({ where: { status: 'IN_PROGRESS', ...whereCompany } }),
    db.ticket.count({ where: { status: 'WAITING', ...whereCompany } }),
    db.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] }, ...whereCompany } }),
    db.ticket.count({ where: { status: 'RESOLVED', closedAt: { gte: monthStart }, ...whereCompany } }),
    db.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }, ...whereCompany },
      include: { customer: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.ticket.groupBy({
      by: ['priority'],
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, ...whereCompany },
      _count: { id: true },
    }),
    db.ticket.groupBy({
      by: ['assignedToId'],
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, ...whereCompany },
      _count: { id: true },
    }),
  ])

  // Get assignee names
  const assigneeIds = assigneeStats
    .filter(a => a.assignedToId)
    .map(a => a.assignedToId as string)
  
  const assignees = await db.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, name: true },
  })

  const assigneeMap = assignees.reduce((acc, user) => {
    acc[user.id] = user.name
    return acc
  }, {} as Record<string, string>)

  const totalActive = openTickets + inProgressTickets + waitingTickets
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offen</CardTitle>
            <Ticket className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <p className="text-xs text-muted-foreground">Neue Tickets</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Bearbeitung</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">Aktiv bearbeitet</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wartend</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingTickets}</div>
            <p className="text-xs text-muted-foreground">Warten auf Antwort</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dringend</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentTickets}</div>
            <p className="text-xs text-muted-foreground">Sofort bearbeiten</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Geloest (Monat)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/tickets">
            <CardContent className="flex items-center gap-3 pt-6">
              <Ticket className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Tickets</p>
                <p className="text-xs text-muted-foreground">{totalActive} aktiv</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </CardContent>
          </Link>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/tickets/new">
            <CardContent className="flex items-center gap-3 pt-6">
              <FileEdit className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Neues Ticket</p>
                <p className="text-xs text-muted-foreground">Erstellen</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </CardContent>
          </Link>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Posteingang</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Send className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Gesendet</p>
              <p className="text-xs text-muted-foreground">Demnachst</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Priority & Assignee Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Nach Prioritaet
            </CardTitle>
            <CardDescription>Aktive Tickets nach Dringlichkeit</CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsByPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine aktiven Tickets</p>
            ) : (
              <div className="space-y-3">
                {ticketsByPriority.map((item) => (
                  <div key={item.priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          item.priority === 'URGENT' ? 'destructive' :
                          item.priority === 'HIGH' ? 'default' :
                          item.priority === 'MEDIUM' ? 'secondary' :
                          'outline'
                        }
                      >
                        {item.priority === 'URGENT' && 'Dringend'}
                        {item.priority === 'HIGH' && 'Hoch'}
                        {item.priority === 'MEDIUM' && 'Mittel'}
                        {item.priority === 'LOW' && 'Niedrig'}
                      </Badge>
                    </div>
                    <span className="font-medium">{item._count.id} Tickets</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-500" />
              Nach Mitarbeiter
            </CardTitle>
            <CardDescription>Tickets pro Bearbeiter</CardDescription>
          </CardHeader>
          <CardContent>
            {assigneeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine zugewiesenen Tickets</p>
            ) : (
              <div className="space-y-3">
                {assigneeStats.map((item) => (
                  <div key={item.assignedToId || 'unassigned'} className="flex items-center justify-between">
                    <span className="text-sm">
                      {item.assignedToId ? assigneeMap[item.assignedToId] || 'Unbekannt' : 'Nicht zugewiesen'}
                    </span>
                    <Badge variant="outline">{item._count.id} Tickets</Badge>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Aktuelle Tickets</CardTitle>
              <CardDescription>Neueste offene und in Bearbeitung</CardDescription>
            </div>
            <Link href="/tickets">
              <Button variant="outline" size="sm">
                Alle anzeigen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
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
                      {ticket.customer?.companyName || ticket.customer?.firstName || 'Kein Kunde'} 
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
                      {ticket.priority === 'URGENT' && 'Dringend'}
                      {ticket.priority === 'HIGH' && 'Hoch'}
                      {ticket.priority === 'MEDIUM' && 'Mittel'}
                      {ticket.priority === 'LOW' && 'Niedrig'}
                    </Badge>
                    <Badge variant="outline">
                      {ticket.status === 'OPEN' && 'Offen'}
                      {ticket.status === 'IN_PROGRESS' && 'In Bearbeitung'}
                      {ticket.status === 'WAITING' && 'Wartend'}
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

export default function MessagesDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nachrichten</h1>
        <p className="text-muted-foreground">Uebersicht ueber Tickets und Kommunikation</p>
      </div>
      
      <Suspense fallback={<MessagesDashboardSkeleton />}>
        <MessagesDashboardStats />
      </Suspense>
    </div>
  )
}

function MessagesDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
