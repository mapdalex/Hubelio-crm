import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'
import bcrypt from 'bcryptjs'
import type { Role, User, CompanyRole, ModuleId } from '@prisma/client'

const secretKey = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const key = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  email: string
  name: string
  role: Role
  // Multi-tenant fields
  companyId?: string
  companyName?: string
  companyRole?: CompanyRole
  accessibleModules?: ModuleId[]
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>,
  companyContext?: {
    companyId: string
    companyName: string
    companyRole: CompanyRole
    accessibleModules: ModuleId[]
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
  
  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    // Include company context if available
    companyId: companyContext?.companyId,
    companyName: companyContext?.companyName,
    companyRole: companyContext?.companyRole,
    accessibleModules: companyContext?.accessibleModules,
    expiresAt,
  }
  
  const token = await encrypt(sessionPayload)
  
  // Session in Datenbank speichern
  await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })
  
  // Cookie setzen
  // WICHTIG: secure nur bei HTTPS, sonst wird Cookie in Docker/localhost nicht gesetzt
  const isSecure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'
  
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: isSecure,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
  
  // Last Login aktualisieren
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) return null
  
  const payload = await decrypt(token)
  if (!payload) return null
  
  // Prüfen ob Session noch gültig
  if (new Date(payload.expiresAt) < new Date()) {
    await deleteSession()
    return null
  }
  
  return payload
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (token) {
    // Session aus Datenbank löschen
    await db.session.deleteMany({
      where: { token },
    }).catch(() => {})
  }
  
  cookieStore.delete('session')
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null
  
  const user = await db.user.findUnique({
    where: { id: session.userId },
  })
  
  return user
}

// Rollen-basierte Berechtigungen
export function canAccess(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPERADMIN'
}

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN'
}

export function isEmployee(role: Role): boolean {
  return role === 'ADMIN' || role === 'MITARBEITER' || role === 'SUPERADMIN'
}

export function isCustomer(role: Role): boolean {
  return role === 'KUNDE'
}

// Check if session can edit data within company (based on company role OR global employee role)
export function canEditInCompany(session: SessionPayload | null): boolean {
  if (!session) return false
  
  // SUPERADMIN can always edit
  if (session.role === 'SUPERADMIN') return true
  
  // Check company role if available (Multi-Tenant)
  if (session.companyRole) {
    // OWNER, ADMIN, MANAGER, MEMBER can edit, VIEWER cannot
    return ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(session.companyRole)
  }
  
  // Fallback to global role check for legacy compatibility
  return isEmployee(session.role)
}

// Check if session can view data within company (based on company role OR global employee role)
export function canViewInCompany(session: SessionPayload | null): boolean {
  if (!session) return false
  
  // SUPERADMIN can always view
  if (session.role === 'SUPERADMIN') return true
  
  // Check company role if available (Multi-Tenant)
  if (session.companyRole) {
    // All company roles can view
    return ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'].includes(session.companyRole)
  }
  
  // Fallback to global role check for legacy compatibility
  return isEmployee(session.role)
}

// Get current user with company context
export async function getCurrentUserWithCompany(): Promise<{
  user: User
  companyId?: string
  companyRole?: CompanyRole
} | null> {
  const session = await getSession()
  if (!session) return null
  
  const user = await db.user.findUnique({
    where: { id: session.userId },
  })
  
  if (!user) return null
  
  return {
    user,
    companyId: session.companyId,
    companyRole: session.companyRole,
  }
}

// Update session with new company context
export async function updateSessionCompany(
  userId: string,
  companyContext: {
    companyId: string
    companyName: string
    companyRole: CompanyRole
    accessibleModules: ModuleId[]
  }
): Promise<void> {
  const session = await getSession()
  if (!session || session.userId !== userId) return
  
  // Get user data
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })
  
  if (!user) return
  
  // Delete old session
  await deleteSession()
  
  // Create new session with company context
  await createSession(user, companyContext)
}

// Check if user can access module
export async function canAccessModule(moduleId: ModuleId): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  
  // CORE is always accessible
  if (moduleId === 'CORE') return true
  
  // Check if module is in accessible modules
  return session.accessibleModules?.includes(moduleId) || false
}
