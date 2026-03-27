import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'
import bcrypt from 'bcryptjs'
import type { Role, User } from '@prisma/client'

const secretKey = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const key = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  email: string
  name: string
  role: Role
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

export async function createSession(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
  
  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN'
}

export function isEmployee(role: Role): boolean {
  return role === 'ADMIN' || role === 'MITARBEITER'
}

export function isCustomer(role: Role): boolean {
  return role === 'KUNDE'
}
