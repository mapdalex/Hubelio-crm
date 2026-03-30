// Seed script for Hublio Modules
// Run with: npx tsx scripts/seed-modules.ts

import { PrismaClient, ModuleId, ModuleStatus } from '@prisma/client'

const prisma = new PrismaClient()

const modules = [
  {
    moduleId: ModuleId.CORE,
    name: 'Hublio Core',
    description: 'Benutzerverwaltung, Rollen & Rechte, Firmenstruktur, Kontakte, Tags & Segmente, System Settings',
    icon: 'building-2',
    features: [
      'user_management',
      'roles_permissions',
      'company_structure',
      'contacts_management',
      'tags_segments',
      'system_settings',
    ],
    basePrice: 0,
    status: ModuleStatus.ACTIVE,
    sortOrder: 0,
  },
  {
    moduleId: ModuleId.MESSAGE,
    name: 'Hublio Message',
    description: 'E-Mail Integration, Chat, WhatsApp, Social DMs, Zentrale Kommunikation',
    icon: 'mail',
    features: [
      'email_integration',
      'email_sync',
      'email_templates',
      'chat_integration',
      'whatsapp_integration',
      'central_inbox',
    ],
    basePrice: 19.99,
    status: ModuleStatus.ACTIVE,
    sortOrder: 1,
  },
  {
    moduleId: ModuleId.SALES,
    name: 'Hublio Sales',
    description: 'Rechnungen, Angebote, Einnahmen/Ausgaben, Verträge, Finance Management',
    icon: 'shopping-cart',
    features: [
      'invoices',
      'quotes',
      'income_expenses',
      'contracts',
      'finance_dashboard',
      'payment_tracking',
    ],
    basePrice: 29.99,
    status: ModuleStatus.ACTIVE,
    sortOrder: 2,
  },
  {
    moduleId: ModuleId.SOCIALS,
    name: 'Hublio Socials',
    description: 'Social Media Management, Content Planning, Multi-Platform Publishing',
    icon: 'share-2',
    features: [
      'social_accounts',
      'content_calendar',
      'post_scheduling',
      'multi_platform',
      'engagement_tracking',
    ],
    basePrice: 24.99,
    status: ModuleStatus.ACTIVE,
    sortOrder: 3,
  },
  {
    moduleId: ModuleId.CAMPAIGNS,
    name: 'Hublio Campaigns',
    description: 'E-Mail Kampagnen, Newsletter, Funnels, Marketing Automation',
    icon: 'megaphone',
    features: [
      'email_campaigns',
      'newsletter',
      'funnels',
      'automation',
      'ab_testing',
      'campaign_analytics',
    ],
    basePrice: 39.99,
    status: ModuleStatus.ACTIVE,
    sortOrder: 4,
  },
  {
    moduleId: ModuleId.ANALYTICS,
    name: 'Hublio Analytics',
    description: 'Dashboard KPIs, Revenue Tracking, Leads Analytics, Conversion Tracking',
    icon: 'bar-chart-3',
    features: [
      'dashboard_kpis',
      'revenue_tracking',
      'leads_analytics',
      'conversion_tracking',
      'custom_reports',
      'data_export',
    ],
    basePrice: 14.99,
    status: ModuleStatus.ACTIVE,
    sortOrder: 5,
  },
]

async function main() {
  console.log('Seeding Hublio modules...')

  for (const module of modules) {
    const existing = await prisma.module.findUnique({
      where: { moduleId: module.moduleId },
    })

    if (existing) {
      console.log(`Updating module: ${module.name}`)
      await prisma.module.update({
        where: { moduleId: module.moduleId },
        data: module,
      })
    } else {
      console.log(`Creating module: ${module.name}`)
      await prisma.module.create({
        data: module,
      })
    }
  }

  console.log('Modules seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding modules:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
