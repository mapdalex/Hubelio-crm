import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'
import { getCompanyContext } from '@/lib/multi-tenant'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }
    
    // Benutzer suchen
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }
    
    // Pruefen ob Benutzer aktiv ist
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Dieser Account ist deaktiviert' },
        { status: 401 }
      )
    }
    
    // Passwort pruefen
    const isValid = await verifyPassword(password, user.password)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }
    
    // Company-Kontext laden (Multi-Tenant)
    // SUPERADMIN kann ohne Company arbeiten, andere brauchen eine Firma
    let companyContext = undefined
    if (user.role !== 'SUPERADMIN') {
      const ctx = await getCompanyContext(user.id)
      if (ctx) {
        // Lade die zugänglichen Module für diese Firma
        const subscriptions = await db.subscription.findMany({
          where: {
            companyId: ctx.company.id,
            status: 'ACTIVE',
          },
          include: {
            module: true,
          },
        })
        const accessibleModules = subscriptions.map((s) => s.module.moduleId)
        
        companyContext = {
          companyId: ctx.company.id,
          companyName: ctx.company.name,
          companyRole: ctx.role,
          accessibleModules,
        }
      }
    } else {
      // SUPERADMIN: Prüfe ob eine Firma ausgewählt ist (optional)
      const ctx = await getCompanyContext(user.id)
      if (ctx) {
        const subscriptions = await db.subscription.findMany({
          where: {
            companyId: ctx.company.id,
            status: 'ACTIVE',
          },
          include: {
            module: true,
          },
        })
        const accessibleModules = subscriptions.map((s) => s.module.moduleId)
        
        companyContext = {
          companyId: ctx.company.id,
          companyName: ctx.company.name,
          companyRole: ctx.role,
          accessibleModules,
        }
      }
    }
    
    // Session erstellen mit Company-Kontext
    await createSession(user, companyContext)
    
    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
