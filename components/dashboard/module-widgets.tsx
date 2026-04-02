'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Ticket,
  Globe,
  ShoppingCart,
  Monitor,
  Shield,
  AlertCircle,
  TrendingUp,
  Share2,
  Mail,
  BarChart3,
  MessageSquare,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
} from 'lucide-react'

// CORE Module Widget
export function CoreWidget({ data }: { data: { customerCount: number; recentCustomers: Array<{ id: string; firstName: string; lastName: string; companyName?: string | null }> } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Kunden
          </CardTitle>
          <Badge variant="secondary">CORE</Badge>
        </div>
        <CardDescription>Kundenverwaltung</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{data.customerCount}</div>
        <p className="text-sm text-muted-foreground">Aktive Kunden</p>
        <Link href="/customers" className="text-xs text-primary hover:underline mt-2 inline-block">
          Alle anzeigen
        </Link>
      </CardContent>
    </Card>
  )
}

// IT Module Widget
export function ITWidget({ data }: { data: { computerCount: number; activeComputerCount: number; domainCount: number; domainsExpiringSoon: number; warrantyExpiringSoon: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            IT-Verwaltung
          </CardTitle>
          <Badge variant="secondary">IT</Badge>
        </div>
        <CardDescription>Geraete und Domains</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.activeComputerCount}</div>
            <p className="text-xs text-muted-foreground">Aktive Geraete</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.domainCount}</div>
            <p className="text-xs text-muted-foreground">Domains</p>
          </div>
        </div>
        {(data.domainsExpiringSoon > 0 || data.warrantyExpiringSoon > 0) && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-muted-foreground">
              {data.domainsExpiringSoon > 0 && `${data.domainsExpiringSoon} Domain(s) erneuern`}
              {data.domainsExpiringSoon > 0 && data.warrantyExpiringSoon > 0 && ', '}
              {data.warrantyExpiringSoon > 0 && `${data.warrantyExpiringSoon} Garantie(n) ablaufend`}
            </span>
          </div>
        )}
        <Link href="/it" className="text-xs text-primary hover:underline inline-block">
          IT-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// SALES Module Widget
export function SalesWidget({ data }: { data: { serviceCount: number; activeServiceCount: number; servicesRenewalSoon: number; monthlyRevenue: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Verkauf
          </CardTitle>
          <Badge variant="secondary">SALES</Badge>
        </div>
        <CardDescription>Services und Umsatz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.activeServiceCount}</div>
            <p className="text-xs text-muted-foreground">Aktive Services</p>
          </div>
          <div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {data.monthlyRevenue.toLocaleString('de-DE')}
            </div>
            <p className="text-xs text-muted-foreground">Monatl. Umsatz</p>
          </div>
        </div>
        {data.servicesRenewalSoon > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{data.servicesRenewalSoon} Service(s) zur Verrechnung</span>
          </div>
        )}
        <Link href="/sales/services" className="text-xs text-primary hover:underline inline-block">
          Sales-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// MESSAGE Module Widget (Tickets)
export function MessageWidget({ data }: { data: { openTickets: number; inProgressTickets: number; urgentTickets: number; resolvedThisMonth: number; totalActive: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Nachrichten
          </CardTitle>
          <Badge variant="secondary">MESSAGE</Badge>
        </div>
        <CardDescription>Tickets und Kommunikation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.totalActive}</div>
            <p className="text-xs text-muted-foreground">Aktive Tickets</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{data.resolvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Geloest (Monat)</p>
          </div>
        </div>
        {data.urgentTickets > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-destructive font-medium">{data.urgentTickets} dringende Tickets</span>
          </div>
        )}
        <Link href="/tickets" className="text-xs text-primary hover:underline inline-block">
          Tickets-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// SOCIALS Module Widget
export function SocialsWidget({ data }: { data: { connectedAccounts: number; scheduledPosts: number; publishedThisMonth: number; engagement: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Social Media
          </CardTitle>
          <Badge variant="secondary">SOCIALS</Badge>
        </div>
        <CardDescription>Accounts und Posts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.connectedAccounts}</div>
            <p className="text-xs text-muted-foreground">Accounts</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">Geplante Posts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{data.publishedThisMonth} Posts diesen Monat</span>
        </div>
        <Link href="/socials" className="text-xs text-primary hover:underline inline-block">
          Social-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// CAMPAIGNS Module Widget
export function CampaignsWidget({ data }: { data: { activeCampaigns: number; emailsSent: number; openRate: number; clickRate: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Kampagnen
          </CardTitle>
          <Badge variant="secondary">CAMPAIGNS</Badge>
        </div>
        <CardDescription>E-Mail Marketing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">Aktive Kampagnen</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.emailsSent}</div>
            <p className="text-xs text-muted-foreground">E-Mails gesendet</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Oeffnungsrate: {data.openRate}%</span>
          <span>Klickrate: {data.clickRate}%</span>
        </div>
        <Link href="/campaigns" className="text-xs text-primary hover:underline inline-block">
          Kampagnen-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// ANALYTICS Module Widget
export function AnalyticsWidget({ data }: { data: { totalCustomers: number; totalRevenue: number; openTickets: number; conversionRate: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analytics
          </CardTitle>
          <Badge variant="secondary">ANALYTICS</Badge>
        </div>
        <CardDescription>Auswertungen und Reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{data.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Gesamt Kunden</p>
          </div>
          <div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {data.totalRevenue.toLocaleString('de-DE')}
            </div>
            <p className="text-xs text-muted-foreground">Gesamt Umsatz</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Conversion: {data.conversionRate}%</span>
        </div>
        <Link href="/analytics" className="text-xs text-primary hover:underline inline-block">
          Analytics-Dashboard oeffnen
        </Link>
      </CardContent>
    </Card>
  )
}

// Dashboard Grid that renders widgets based on accessible modules
export function ModuleDashboardGrid({ 
  modules, 
  accessibleModules 
}: { 
  modules: Record<string, unknown>
  accessibleModules: string[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accessibleModules.includes('CORE') && modules.CORE && (
        <CoreWidget data={modules.CORE as { customerCount: number; recentCustomers: Array<{ id: string; firstName: string; lastName: string; companyName?: string | null }> }} />
      )}
      {accessibleModules.includes('MESSAGE') && modules.MESSAGE && (
        <MessageWidget data={modules.MESSAGE as { openTickets: number; inProgressTickets: number; urgentTickets: number; resolvedThisMonth: number; totalActive: number }} />
      )}
      {accessibleModules.includes('IT') && modules.IT && (
        <ITWidget data={modules.IT as { computerCount: number; activeComputerCount: number; domainCount: number; domainsExpiringSoon: number; warrantyExpiringSoon: number }} />
      )}
      {accessibleModules.includes('SALES') && modules.SALES && (
        <SalesWidget data={modules.SALES as { serviceCount: number; activeServiceCount: number; servicesRenewalSoon: number; monthlyRevenue: number }} />
      )}
      {accessibleModules.includes('SOCIALS') && modules.SOCIALS && (
        <SocialsWidget data={modules.SOCIALS as { connectedAccounts: number; scheduledPosts: number; publishedThisMonth: number; engagement: number }} />
      )}
      {accessibleModules.includes('CAMPAIGNS') && modules.CAMPAIGNS && (
        <CampaignsWidget data={modules.CAMPAIGNS as { activeCampaigns: number; emailsSent: number; openRate: number; clickRate: number }} />
      )}
      {accessibleModules.includes('ANALYTICS') && modules.ANALYTICS && (
        <AnalyticsWidget data={modules.ANALYTICS as { totalCustomers: number; totalRevenue: number; openTickets: number; conversionRate: number }} />
      )}
    </div>
  )
}
