import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Edge-kompatible JWT Verifikation - kein Prisma Import!
const secretKey = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const key = new TextEncoder().encode(secretKey)

type SessionPayload = {
  userId: string
  email: string
  name: string
  role: string
  expiresAt: string
}

async function decryptToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Oeffentliche Routen (ohne Auth)
const publicRoutes = ['/login', '/setup', '/api/auth/login', '/api/auth/setup']

// Admin-only Routen
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Statische Assets ueberspringen
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') ||
    path.includes('.')
  ) {
    return NextResponse.next()
  }
  
  // Oeffentliche Routen erlauben
  if (publicRoutes.some(route => path.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Session pruefen
  const token = request.cookies.get('session')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  const session = await decryptToken(token)
  
  if (!session || new Date(session.expiresAt) < new Date()) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
  
  // Admin-Routen pruefen
  if (adminRoutes.some(route => path.startsWith(route))) {
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
