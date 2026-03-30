import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await prisma.modulePermission.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.module.deleteMany()
  await prisma.companyUser.deleteMany()
  await prisma.company.deleteMany()

  // Create modules
  console.log('📦 Creating modules...')
  const modules = await Promise.all([
    prisma.module.create({
      data: {
        moduleId: 'CORE',
        name: 'Core',
        description: 'Basis CRM Funktionen',
        icon: 'LayoutDashboard',
        features: JSON.stringify(['dashboard', 'customers', 'tickets', 'todos', 'files']),
        basePrice: 0,
        status: 'ACTIVE',
        sortOrder: 1,
      },
    }),
    prisma.module.create({
      data: {
        moduleId: 'MESSAGE',
        name: 'Nachrichten',
        description: 'E-Mail und Messaging Verwaltung',
        icon: 'MessageSquare',
        features: JSON.stringify(['email', 'inbox', 'templates', 'automation']),
        basePrice: 99,
        status: 'ACTIVE',
        sortOrder: 2,
      },
    }),
    prisma.module.create({
      data: {
        moduleId: 'SALES',
        name: 'Verkauf',
        description: 'Domains und Services Verwaltung',
        icon: 'ShoppingCart',
        features: JSON.stringify(['domains', 'services', 'pricing', 'orders']),
        basePrice: 149,
        status: 'ACTIVE',
        sortOrder: 3,
      },
    }),
    prisma.module.create({
      data: {
        moduleId: 'SOCIALS',
        name: 'Soziale Medien',
        description: 'Social Media Management',
        icon: 'Share2',
        features: JSON.stringify(['accounts', 'posting', 'analytics', 'scheduling']),
        basePrice: 199,
        status: 'BETA',
        sortOrder: 4,
      },
    }),
    prisma.module.create({
      data: {
        moduleId: 'CAMPAIGNS',
        name: 'Kampagnen',
        description: 'Marketing Kampagnen Management',
        icon: 'TrendingUp',
        features: JSON.stringify(['campaign_builder', 'audience', 'tracking', 'reports']),
        basePrice: 249,
        status: 'BETA',
        sortOrder: 5,
      },
    }),
    prisma.module.create({
      data: {
        moduleId: 'ANALYTICS',
        name: 'Analytics',
        description: 'Erweiterte Datenanalyse',
        icon: 'BarChart3',
        features: JSON.stringify(['dashboards', 'reports', 'export', 'insights']),
        basePrice: 299,
        status: 'ACTIVE',
        sortOrder: 6,
      },
    }),
  ])

  console.log('✅ Modules created')

  // Create test company
  console.log('🏢 Creating test company...')
  const company = await prisma.company.create({
    data: {
      name: 'Test Company',
      slug: 'test-company',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      isActive: true,
    },
  })

  console.log('✅ Company created')

  // Create admin user
  console.log('👤 Creating admin user...')
  const hashedPassword = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin user created')

  // Link user to company
  console.log('🔗 Linking user to company...')
  const companyUser = await prisma.companyUser.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: 'OWNER',
      isDefault: true,
    },
  })

  console.log('✅ User linked to company')

  // Create subscriptions for all modules
  console.log('📋 Creating subscriptions...')
  await Promise.all(
    modules.map(module =>
      prisma.subscription.create({
        data: {
          companyId: company.id,
          moduleId: module.id,
          tier: 'PRO',
          status: 'ACTIVE',
          seatLimit: 10,
        },
      })
    )
  )

  console.log('✅ Subscriptions created')

  // Create module permissions
  console.log('🔐 Creating module permissions...')
  await Promise.all(
    modules.map(module =>
      prisma.modulePermission.create({
        data: {
          companyUserId: companyUser.id,
          moduleId: module.moduleId,
          canAccess: true,
          canEdit: true,
          canAdmin: true,
        },
      })
    )
  )

  console.log('✅ Module permissions created')

  console.log('🎉 Seeding completed!')
  console.log('')
  console.log('📍 Test Credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: password123')
  console.log('   Company: Test Company')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
