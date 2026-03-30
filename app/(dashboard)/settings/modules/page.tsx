'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth-context'
import {
  Building2,
  Mail,
  ShoppingCart,
  Share2,
  Megaphone,
  BarChart3,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import type { ModuleId } from '@prisma/client'

type ModuleInfo = {
  moduleId: ModuleId
  name: string
  description: string | null
  icon: string | null
  features: string[]
  isSubscribed: boolean
  subscriptionTier?: string
  subscriptionStatus?: string
  basePrice?: number
}

const moduleIcons: Record<string, React.ReactNode> = {
  'building-2': <Building2 className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  'shopping-cart': <ShoppingCart className="h-6 w-6" />,
  'share-2': <Share2 className="h-6 w-6" />,
  megaphone: <Megaphone className="h-6 w-6" />,
  'bar-chart-3': <BarChart3 className="h-6 w-6" />,
}

const featureLabels: Record<string, string> = {
  user_management: 'Benutzerverwaltung',
  roles_permissions: 'Rollen & Rechte',
  company_structure: 'Firmenstruktur',
  contacts_management: 'Kontaktverwaltung',
  tags_segments: 'Tags & Segmente',
  system_settings: 'Systemeinstellungen',
  email_integration: 'E-Mail Integration',
  email_sync: 'E-Mail Synchronisation',
  email_templates: 'E-Mail Vorlagen',
  chat_integration: 'Chat Integration',
  whatsapp_integration: 'WhatsApp Integration',
  central_inbox: 'Zentrale Inbox',
  invoices: 'Rechnungen',
  quotes: 'Angebote',
  income_expenses: 'Einnahmen/Ausgaben',
  contracts: 'Vertraege',
  finance_dashboard: 'Finanz-Dashboard',
  payment_tracking: 'Zahlungsverfolgung',
  social_accounts: 'Social Accounts',
  content_calendar: 'Content Kalender',
  post_scheduling: 'Post Planung',
  multi_platform: 'Multi-Platform',
  engagement_tracking: 'Engagement Tracking',
  email_campaigns: 'E-Mail Kampagnen',
  newsletter: 'Newsletter',
  funnels: 'Funnels',
  automation: 'Automatisierung',
  ab_testing: 'A/B Testing',
  campaign_analytics: 'Kampagnen-Analytik',
  dashboard_kpis: 'Dashboard KPIs',
  revenue_tracking: 'Umsatzverfolgung',
  leads_analytics: 'Leads Analytik',
  conversion_tracking: 'Conversion Tracking',
  custom_reports: 'Benutzerdefinierte Berichte',
  data_export: 'Datenexport',
}

export default function ModulesSettingsPage() {
  const { currentCompany, canManageCompany } = useAuth()
  const [modules, setModules] = useState<ModuleInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingModule, setUpdatingModule] = useState<string | null>(null)

  useEffect(() => {
    loadModules()
  }, [currentCompany?.id])

  const loadModules = async () => {
    try {
      const res = await fetch('/api/modules')
      if (res.ok) {
        const data = await res.json()
        setModules(data.modules)
      }
    } catch (error) {
      console.error('Error loading modules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleModule = async (moduleId: ModuleId, enable: boolean) => {
    if (!canManageCompany()) return
    if (moduleId === 'CORE') return // Cannot disable CORE

    setUpdatingModule(moduleId)
    try {
      if (enable) {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId,
            tier: 'FREE',
            status: 'ACTIVE',
          }),
        })
      } else {
        await fetch('/api/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId }),
        })
      }
      await loadModules()
    } catch (error) {
      console.error('Error updating subscription:', error)
    } finally {
      setUpdatingModule(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Keine Firma ausgewaehlt</CardTitle>
            <CardDescription>
              Bitte waehlen Sie zuerst eine Firma aus oder erstellen Sie eine neue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Module</h1>
        <p className="text-muted-foreground">
          Verwalten Sie die Module fuer {currentCompany.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card
            key={module.moduleId}
            className={module.isSubscribed ? 'border-primary/50' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      module.isSubscribed
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {moduleIcons[module.icon || 'building-2']}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    {module.moduleId === 'CORE' ? (
                      <Badge variant="secondary" className="mt-1">
                        Inklusive
                      </Badge>
                    ) : module.isSubscribed ? (
                      <Badge variant="default" className="mt-1">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                </div>
                {module.moduleId !== 'CORE' && canManageCompany() && (
                  <div className="flex items-center gap-2">
                    {updatingModule === module.moduleId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={module.isSubscribed}
                        onCheckedChange={(checked) =>
                          toggleModule(module.moduleId, checked)
                        }
                      />
                    )}
                  </div>
                )}
              </div>
              <CardDescription className="mt-2">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Funktionen:</p>
                <div className="flex flex-wrap gap-1">
                  {module.features.slice(0, 4).map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {featureLabels[feature] || feature}
                    </Badge>
                  ))}
                  {module.features.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{module.features.length - 4} mehr
                    </Badge>
                  )}
                </div>
              </div>
              {module.basePrice !== undefined && module.basePrice > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Ab{' '}
                    <span className="font-semibold text-foreground">
                      {module.basePrice.toFixed(2)} EUR
                    </span>{' '}
                    / Monat
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktive Module Uebersicht</CardTitle>
          <CardDescription>
            Alle fuer {currentCompany.name} aktivierten Module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((module) => (
              <div
                key={module.moduleId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      module.isSubscribed
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {moduleIcons[module.icon || 'building-2']}
                  </div>
                  <span className="font-medium">{module.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {module.isSubscribed ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Aktiv
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <X className="h-4 w-4" />
                      Inaktiv
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
