import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('[Login] POST request received')
    const { email, password } = await request.json()
    console.log('[Login] Attempting login for email:', email)
    
    if (!email || !password) {
      console.log('[Login] Missing email or password')
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }
    
    // Benutzer suchen
    console.log('[Login] Looking up user...')
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    
    if (!user) {
      console.log('[Login] User not found for email:', email.toLowerCase())
      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }
    console.log('[Login] User found:', user.id, 'Role:', user.role, 'Active:', user.isActive)
    
    // Prüfen ob Benutzer aktiv ist
    if (!user.isActive) {
      console.log('[Login] User is deactivated')
      return NextResponse.json(
        { error: 'Dieser Account ist deaktiviert' },
        { status: 401 }
      )
    }
    
    // Passwort prüfen
    console.log('[Login] Verifying password...')
    const isValid = await verifyPassword(password, user.password)
    console.log('[Login] Password valid:', isValid)
    
    if (!isValid) {
      console.log('[Login] Invalid password for user:', email)
      return NextResponse.json(
        { error: 'Ungueltige Anmeldedaten' },
        { status: 401 }
      )
    }
    
    // Session erstellen
    console.log('[Login] Creating session...')
    await createSession(user)
    console.log('[Login] Session created successfully')
    
    // Aktivitätslog
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })
    
    console.log('[Login] Login successful for user:', user.id)
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
    console.error('[Login] Error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
