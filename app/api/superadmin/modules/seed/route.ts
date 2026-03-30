import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/superadmin/modules/seed - Initialisiert alle Module in der Datenbank
export async function POST() {
  try {
    const session = await getSession()
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }
    
    // Pruefe ob der Benutzer SUPERADMIN ist (session.role enthaelt die Rolle)
    if (session.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Module-Definitionen
    const modules = [
      {
        moduleId: 'CORE',
        name: 'Kern-Modul',
        description: 'Basis CRM Funktionen: Kunden, Kontakte, Todos',
        icon: 'LayoutDashboard',
        features: JSON.stringify(['dashboard', 'customers', 'contacts', 'todos', 'tickets', 'files']),
        basePrice: 0,
        status: 'ACTIVE',
        sortOrder: 1,
      },
      {
        moduleId: 'MESSAGE',
        name: 'Nachrichten',
        description: 'E-Mail und Messaging Verwaltung',
        icon: 'MessageSquare',
        features: JSON.stringify(['email', 'inbox', 'templates', 'automation']),
        basePrice: 99,
        status: 'ACTIVE',
        sortOrder: 2,
      },
      {
        moduleId: 'SALES',
        name: 'Vertrieb',
        description: 'Angebote, Auftraege, Rechnungen, Pipeline',
        icon: 'ShoppingCart',
        features: JSON.stringify(['domains', 'services', 'pricing', 'orders']),
        basePrice: 149,
        status: 'ACTIVE',
        sortOrder: 3,
      },
      {
        moduleId: 'IT',
        name: 'IT & Support',
        description: 'Ticket-System, Asset-Management, PCs & Geraete',
        icon: 'Headphones',
        features: JSON.stringify(['tickets', 'assets', 'computers', 'domains', 'knowledge_base', 'sla']),
        basePrice: 149,
        status: 'ACTIVE',
        sortOrder: 4,
      },
      {
        moduleId: 'SOCIALS',
        name: 'Social Media',
        description: 'Social Media Management und Planung',
        icon: 'Share2',
        features: JSON.stringify(['accounts', 'posting', 'analytics', 'scheduling']),
        basePrice: 199,
        status: 'BETA',
        sortOrder: 5,
      },
      {
        moduleId: 'CAMPAIGNS',
        name: 'Kampagnen',
        description: 'Marketing Kampagnen und E-Mail-Marketing',
        icon: 'TrendingUp',
        features: JSON.stringify(['campaign_builder', 'audience', 'tracking', 'reports']),
        basePrice: 249,
        status: 'BETA',
        sortOrder: 6,
      },
      {
        moduleId: 'ANALYTICS',
        name: 'Analytics',
        description: 'Berichte, Dashboards, KPIs, Auswertungen',
        icon: 'BarChart3',
        features: JSON.stringify(['dashboards', 'reports', 'export', 'insights']),
        basePrice: 299,
        status: 'ACTIVE',
        sortOrder: 7,
      },
    ]

    // Upsert alle Module
    const results = await Promise.all(
      modules.map(module =>
        db.module.upsert({
          where: { moduleId: module.moduleId },
          update: {
            name: module.name,
            description: module.description,
            icon: module.icon,
            features: module.features,
            basePrice: module.basePrice,
            status: module.status,
            sortOrder: module.sortOrder,
          },
          create: module,
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `${results.length} Module erfolgreich initialisiert`,
      modules: results.map(m => ({ moduleId: m.moduleId, name: m.name })),
    })
  } catch (error) {
    console.error('Error seeding modules:', error)
    return NextResponse.json(
      { error: 'Fehler beim Initialisieren der Module' },
      { status: 500 }
    )
  }
}
