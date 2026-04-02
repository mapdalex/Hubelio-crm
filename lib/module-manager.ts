// Module Manager - Handles module availability and feature flags
import { db } from './db'
import { ModuleId, SubscriptionStatus, CompanyRole } from '@prisma/client'

export type ModuleInfo = {
  moduleId: ModuleId
  name: string
  description: string | null
  icon: string | null
  features: string[]
  isSubscribed: boolean
  subscriptionTier?: string
  subscriptionStatus?: SubscriptionStatus
}

// Module feature definitions
export const MODULE_FEATURES: Record<ModuleId, string[]> = {
  CORE: [
    'user_management',
    'roles_permissions',
    'company_structure',
    'contacts_management',
    'tags_segments',
    'system_settings',
  ],
  MESSAGE: [
    'email_integration',
    'email_sync',
    'email_templates',
    'chat_integration',
    'whatsapp_integration',
    'central_inbox',
  ],
  SALES: [
    'invoices',
    'quotes',
    'income_expenses',
    'contracts',
    'finance_dashboard',
    'payment_tracking',
  ],
  IT: [
    'computers_management',
    'devices_inventory',
    'domains_management',
    'hardware_tracking',
    'warranty_management',
    'network_documentation',
  ],
  SOCIALS: [
    'social_accounts',
    'content_calendar',
    'post_scheduling',
    'multi_platform',
    'engagement_tracking',
  ],
  CAMPAIGNS: [
    'email_campaigns',
    'newsletter',
    'funnels',
    'automation',
    'ab_testing',
    'campaign_analytics',
  ],
  ANALYTICS: [
    'dashboard_kpis',
    'revenue_tracking',
    'leads_analytics',
    'conversion_tracking',
    'custom_reports',
    'data_export',
  ],
}

// Route to module mapping
export const ROUTE_MODULE_MAP: Record<string, ModuleId> = {
  '/dashboard': ModuleId.CORE,
  '/customers': ModuleId.CORE,
  '/contacts': ModuleId.CORE,
  '/settings': ModuleId.CORE,
  '/files': ModuleId.CORE,
  '/tickets': ModuleId.MESSAGE,
  '/inbox': ModuleId.MESSAGE,
  '/email': ModuleId.MESSAGE,
  '/sales': ModuleId.SALES,
  '/invoices': ModuleId.SALES,
  '/quotes': ModuleId.SALES,
  '/contracts': ModuleId.SALES,
  '/it': ModuleId.IT,
  '/it/computers': ModuleId.IT,
  '/it/domains': ModuleId.IT,
  '/socials': ModuleId.SOCIALS,
  '/social-media': ModuleId.SOCIALS,
  '/campaigns': ModuleId.CAMPAIGNS,
  '/newsletter': ModuleId.CAMPAIGNS,
  '/funnels': ModuleId.CAMPAIGNS,
  '/analytics': ModuleId.ANALYTICS,
  '/reports': ModuleId.ANALYTICS,
}

// Get module required for a route
export function getModuleForRoute(pathname: string): ModuleId | null {
  // Check exact match first
  if (ROUTE_MODULE_MAP[pathname]) {
    return ROUTE_MODULE_MAP[pathname]
  }

  // Check prefix match
  for (const [route, moduleId] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname.startsWith(route)) {
      return moduleId
    }
  }

  // Default to CORE for unmatched routes
  return ModuleId.CORE
}

// Check if company has access to a module
export async function hasModuleAccess(
  companyId: string,
  moduleId: ModuleId
): Promise<boolean> {
  // CORE module is always accessible
  if (moduleId === ModuleId.CORE) {
    return true
  }

  const subscription = await db.subscription.findUnique({
    where: {
      companyId_moduleId: {
        companyId,
        moduleId: await getModuleDbId(moduleId),
      },
    },
  })

  if (!subscription) return false

  return (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.TRIAL
  )
}

// Get the database module ID from enum
async function getModuleDbId(moduleId: ModuleId): Promise<string> {
  const module = await db.module.findUnique({
    where: { moduleId },
    select: { id: true },
  })
  return module?.id || ''
}

// Get all modules with subscription status for a company
export async function getCompanyModules(companyId: string): Promise<ModuleInfo[]> {
  const modules = await db.module.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      subscriptions: {
        where: { companyId },
        take: 1,
      },
    },
  })

  return modules.map((module) => {
    const subscription = module.subscriptions[0]
    return {
      moduleId: module.moduleId,
      name: module.name,
      description: module.description,
      icon: module.icon,
      features: module.features,
      isSubscribed:
        module.moduleId === ModuleId.CORE ||
        (subscription &&
          (subscription.status === SubscriptionStatus.ACTIVE ||
            subscription.status === SubscriptionStatus.TRIAL)),
      subscriptionTier: subscription?.tier,
      subscriptionStatus: subscription?.status,
    }
  })
}

// Check if user has module permission within company
export async function hasModulePermission(
  userId: string,
  companyId: string,
  moduleId: ModuleId,
  permission: 'access' | 'edit' | 'admin' = 'access'
): Promise<boolean> {
  // CORE is always accessible
  if (moduleId === ModuleId.CORE && permission === 'access') {
    return true
  }

  const companyUser = await db.companyUser.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
    include: {
      modulePermissions: {
        where: { moduleId },
      },
    },
  })

  if (!companyUser) return false

  // Company owners, admins and managers have full access to all subscribed modules
  if (companyUser.role === CompanyRole.OWNER || companyUser.role === CompanyRole.ADMIN || companyUser.role === CompanyRole.MANAGER) {
    return true
  }

  const modulePermission = companyUser.modulePermissions[0]
  if (!modulePermission) return false

  switch (permission) {
    case 'access':
      return modulePermission.canAccess
    case 'edit':
      return modulePermission.canEdit
    case 'admin':
      return modulePermission.canAdmin
    default:
      return false
  }
}

// Get user's accessible modules within a company
export async function getUserAccessibleModules(
  userId: string,
  companyId: string
): Promise<ModuleId[]> {
  const companyUser = await db.companyUser.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
    include: {
      modulePermissions: true,
      company: {
        include: {
          subscriptions: {
            where: {
              status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
            },
            include: { module: true },
          },
        },
      },
    },
  })

  if (!companyUser) return [ModuleId.CORE]

  // Company owners, admins and managers have access to all subscribed modules
  if (companyUser.role === CompanyRole.OWNER || companyUser.role === CompanyRole.ADMIN || companyUser.role === CompanyRole.MANAGER) {
    const subscribedModules = companyUser.company.subscriptions.map(
      (sub) => sub.module.moduleId
    )
    return [ModuleId.CORE, ...subscribedModules]
  }

  // Other users only have access to explicitly permitted modules
  const permittedModules = companyUser.modulePermissions
    .filter((p) => p.canAccess)
    .map((p) => p.moduleId)

  return [ModuleId.CORE, ...permittedModules]
}

// Type for module permission details
export type ModulePermissionDetail = {
  moduleId: ModuleId
  canAccess: boolean
  canEdit: boolean
  canAdmin: boolean
}

// Get user's module permissions with edit rights within a company
export async function getUserModulePermissions(
  userId: string,
  companyId: string
): Promise<ModulePermissionDetail[]> {
  const companyUser = await db.companyUser.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
    include: {
      modulePermissions: true,
      company: {
        include: {
          subscriptions: {
            where: {
              status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
            },
            include: { module: true },
          },
        },
      },
    },
  })

  if (!companyUser) {
    return [{ moduleId: ModuleId.CORE, canAccess: true, canEdit: false, canAdmin: false }]
  }

  // Company owners, admins and managers have full access to all subscribed modules
  if (companyUser.role === CompanyRole.OWNER || companyUser.role === CompanyRole.ADMIN || companyUser.role === CompanyRole.MANAGER) {
    const subscribedModules = companyUser.company.subscriptions.map(
      (sub) => sub.module.moduleId
    )
    return [
      { moduleId: ModuleId.CORE, canAccess: true, canEdit: true, canAdmin: companyUser.role !== CompanyRole.MANAGER },
      ...subscribedModules.map((moduleId) => ({
        moduleId,
        canAccess: true,
        canEdit: true,
        canAdmin: companyUser.role !== CompanyRole.MANAGER,
      })),
    ]
  }

  // MEMBER and VIEWER: use explicit permissions
  // CORE module: MEMBER can edit, VIEWER cannot
  const corePermission: ModulePermissionDetail = {
    moduleId: ModuleId.CORE,
    canAccess: true,
    canEdit: companyUser.role === CompanyRole.MEMBER,
    canAdmin: false,
  }

  // Other modules based on explicit permissions
  const modulePermissions: ModulePermissionDetail[] = companyUser.modulePermissions
    .filter((p) => p.canAccess)
    .map((p) => ({
      moduleId: p.moduleId,
      canAccess: p.canAccess,
      canEdit: p.canEdit,
      canAdmin: p.canAdmin,
    }))

  return [corePermission, ...modulePermissions]
}

// Check if a feature is available
export function hasFeature(moduleId: ModuleId, feature: string): boolean {
  return MODULE_FEATURES[moduleId]?.includes(feature) || false
}

// Get all features for subscribed modules
export async function getCompanyFeatures(companyId: string): Promise<string[]> {
  const modules = await getCompanyModules(companyId)
  const subscribedModules = modules.filter((m) => m.isSubscribed)

  const features: string[] = []
  for (const module of subscribedModules) {
    features.push(...module.features)
  }

  return [...new Set(features)]
}
