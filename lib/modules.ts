import { db } from '@/lib/db'

/**
 * Prüft, ob eine Firma ein bestimmtes Modul aktiviert hat
 */
export async function hasModuleAccess(
  companyId: string,
  moduleId: string
): Promise<boolean> {
  const subscription = await db.subscription.findUnique({
    where: {
      companyId_moduleId: {
        companyId,
        moduleId,
      },
    },
  })

  return !!subscription
}

/**
 * Prüft, ob eine Firma ein Modul mit einem bestimmten Tier aktiviert hat
 */
export async function hasModuleAccessWithTier(
  companyId: string,
  moduleId: string,
  minimumTier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
): Promise<boolean> {
  const tierOrder = { FREE: 1, STARTER: 2, PRO: 3, ENTERPRISE: 4 }

  const subscription = await db.subscription.findUnique({
    where: {
      companyId_moduleId: {
        companyId,
        moduleId,
      },
    },
  })

  if (!subscription) return false

  return tierOrder[subscription.tier] >= tierOrder[minimumTier]
}

/**
 * Holt alle aktivierten Module einer Firma
 */
export async function getCompanyModules(companyId: string) {
  const subscriptions = await db.subscription.findMany({
    where: { companyId },
    include: {
      module: {
        select: {
          moduleId: true,
          name: true,
          description: true,
          icon: true,
          basePrice: true,
          status: true,
        },
      },
    },
    orderBy: { module: { sortOrder: 'asc' } },
  })

  return subscriptions
}

/**
 * Holt alle verfügbaren Module
 */
export async function getAllModules() {
  return db.module.findMany({
    orderBy: { sortOrder: 'asc' },
  })
}
