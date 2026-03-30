import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[v0] Seeding modules...')

  // Module-Definitionen
  const modules = [
    {
      moduleId: 'CORE',
      name: 'Kern-Modul',
      description: 'Basis CRM Funktionen: Kunden, Kontakte, Firmeneinstellungen',
      icon: 'LayoutDashboard',
      features: JSON.stringify(['dashboard', 'customers', 'tickets', 'todos', 'files']),
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
      description: 'Ticket-System, Asset-Management, Wissensdatenbank',
      icon: 'Headphones',
      features: JSON.stringify(['tickets', 'assets', 'knowledge_base', 'sla']),
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

  // Module erstellen oder aktualisieren (upsert)
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { moduleId: mod.moduleId },
      update: {
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        features: mod.features,
        basePrice: mod.basePrice,
        status: mod.status,
        sortOrder: mod.sortOrder,
      },
      create: mod,
    })
    console.log(`  - ${mod.name} (${mod.moduleId}) - ${mod.basePrice} EUR`)
  }

  console.log('')
  console.log('[v0] Module seeding completed!')
  console.log(`[v0] ${modules.length} Module erstellt/aktualisiert.`)
}

main()
  .catch((e) => {
    console.error('[v0] Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
