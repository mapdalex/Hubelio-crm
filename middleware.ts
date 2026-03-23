import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './lib/auth-edge'

// Öffentliche Routen (ohne Auth)
const publicRoutes = ['/login', '/api/auth/login']

// Routen die bestimmte Rollen erfordern
const adminRoutes = ['/admin', '/settings/system']
const employeeRoutes = ['/tickets', '/customers', '/sales', '/todos', '/files']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Statische Assets überspringen
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') ||
    path.includes('.') // Dateien wie .ico, .png etc.
  ) {
    return NextResponse.next()
  }
  
  // Öffentliche Routen erlauben
  if (publicRoutes.includes(path)) {
    return NextResponse.next()
  }
  
  // Session prüfen
  const token = request.cookies.get('session')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  const session = await decrypt(token)
  
  if (!session || new Date(session.expiresAt) < new Date()) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
  
  // Admin-Routen prüfen
  if (adminRoutes.some(route => path.startsWith(route))) {
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // Mitarbeiter-Routen prüfen (Admin hat auch Zugriff)
  if (employeeRoutes.some(route => path.startsWith(route))) {
    if (!['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(session.role)) {
      // Kunden dürfen nur bestimmte Bereiche sehen
      if (session.role === 'KUNDE') {
        // Kunden dürfen ihre eigenen Tickets sehen
        if (!path.startsWith('/tickets') && !path.startsWith('/files')) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
