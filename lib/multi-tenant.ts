// Multi-Tenant Utilities - Company context and data isolation
import { db } from './db'
import { cookies } from 'next/headers'
import { CompanyRole, type Company, type CompanyUser } from '@prisma/client'

const COMPANY_COOKIE_NAME = 'current_company'

export type CompanyContext = {
  company: Company
  companyUser: CompanyUser
  role: CompanyRole
}

// Get current company from cookie
export async function getCurrentCompanyId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COMPANY_COOKIE_NAME)?.value || null
}

// Set current company in cookie
export async function setCurrentCompany(companyId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COMPANY_COOKIE_NAME, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}

// Clear current company cookie
export async function clearCurrentCompany(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COMPANY_COOKIE_NAME)
}

// Get company context for a user
export async function getCompanyContext(
  userId: string,
  companyId?: string | null
): Promise<CompanyContext | null> {
  // If no specific company requested, get default or first
  if (!companyId) {
    companyId = await getCurrentCompanyId()
  }

  let companyUser: (CompanyUser & { company: Company }) | null = null

  if (companyId) {
    // Get specific company user
    companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
      include: { company: true },
    })
  }

  // If no company found, get default company
  if (!companyUser) {
    companyUser = await db.companyUser.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      include: { company: true },
    })
  }

  // If still no company, get first available
  if (!companyUser) {
    companyUser = await db.companyUser.findFirst({
      where: { userId },
      include: { company: true },
      orderBy: { joinedAt: 'asc' },
    })
  }

  if (!companyUser) return null

  // Update cookie with current company
  await setCurrentCompany(companyUser.companyId)

  return {
    company: companyUser.company,
    companyUser,
    role: companyUser.role,
  }
}

// Get all companies for a user
export async function getUserCompanies(
  userId: string
): Promise<(CompanyUser & { company: Company })[]> {
  return db.companyUser.findMany({
    where: { userId },
    include: { company: true },
    orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
  })
}

// Switch to a different company
export async function switchCompany(
  userId: string,
  companyId: string
): Promise<CompanyContext | null> {
  // Verify user has access to company
  const companyUser = await db.companyUser.findUnique({
    where: {
      userId_companyId: { userId, companyId },
    },
    include: { company: true },
  })

  if (!companyUser) return null

  // Update cookie
  await setCurrentCompany(companyId)

  return {
    company: companyUser.company,
    companyUser,
    role: companyUser.role,
  }
}

// Create a new company and assign user as owner
export async function createCompany(
  userId: string,
  data: {
    name: string
    slug: string
    email?: string
    phone?: string
    address?: string
    website?: string
  }
): Promise<Company> {
  // Check if slug is unique
  const existing = await db.company.findUnique({
    where: { slug: data.slug },
  })

  if (existing) {
    throw new Error('Company slug already exists')
  }

  // Create company and user relation in transaction
  const company = await db.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
      },
    })

    // Add user as owner
    await tx.companyUser.create({
      data: {
        userId,
        companyId: newCompany.id,
        role: CompanyRole.OWNER,
        isDefault: true,
      },
    })

    // Subscribe to CORE module by default
    const coreModule = await tx.module.findUnique({
      where: { moduleId: 'CORE' },
    })

    if (coreModule) {
      await tx.subscription.create({
        data: {
          companyId: newCompany.id,
          moduleId: coreModule.id,
          tier: 'FREE',
          status: 'ACTIVE',
        },
      })
    }

    return newCompany
  })

  return company
}

// Add user to company
export async function addUserToCompany(
  userId: string,
  companyId: string,
  role: CompanyRole = CompanyRole.MEMBER
): Promise<CompanyUser> {
  return db.companyUser.create({
    data: {
      userId,
      companyId,
      role,
      isDefault: false,
    },
  })
}

// Remove user from company
export async function removeUserFromCompany(
  userId: string,
  companyId: string
): Promise<void> {
  await db.companyUser.delete({
    where: {
      userId_companyId: { userId, companyId },
    },
  })
}

// Update user role in company
export async function updateUserCompanyRole(
  userId: string,
  companyId: string,
  role: CompanyRole
): Promise<CompanyUser> {
  return db.companyUser.update({
    where: {
      userId_companyId: { userId, companyId },
    },
    data: { role },
  })
}

// Check role-based access
export function canManageCompany(role: CompanyRole): boolean {
  return role === CompanyRole.OWNER || role === CompanyRole.ADMIN
}

export function canManageUsers(role: CompanyRole): boolean {
  return (
    role === CompanyRole.OWNER ||
    role === CompanyRole.ADMIN ||
    role === CompanyRole.MANAGER
  )
}

export function canEditData(role: CompanyRole): boolean {
  return role !== CompanyRole.VIEWER
}

// Generate unique slug from company name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

// Verify slug is unique, append number if needed
export async function generateUniqueSlug(name: string): Promise<string> {
  let slug = generateSlug(name)
  let counter = 0

  while (true) {
    const testSlug = counter === 0 ? slug : `${slug}-${counter}`
    const existing = await db.company.findUnique({
      where: { slug: testSlug },
    })

    if (!existing) {
      return testSlug
    }

    counter++
  }
}
