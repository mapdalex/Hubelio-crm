import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

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
    
    // Session erstellen
    await createSession(user)
    
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
