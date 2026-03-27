import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// Diese Route erstellt den ersten Admin-Benutzer
// Nur verfügbar wenn noch keine Benutzer existieren
export async function POST(request: NextRequest) {
  try {
    console.log('[Setup] POST request received')
    
    // Prüfen ob bereits Benutzer existieren
    const userCount = await db.user.count()
    console.log('[Setup] Current user count:', userCount)
    
    if (userCount > 0) {
      console.log('[Setup] Setup already completed - users exist')
      return NextResponse.json(
        { error: 'Setup bereits abgeschlossen' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { email, password, name, companyName, companyEmail, companyPhone } = body
    console.log('[Setup] Received data for email:', email, 'name:', name)
    
    if (!email || !password || !name) {
      console.log('[Setup] Missing required fields')
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }
    
    if (password.length < 8) {
      console.log('[Setup] Password too short')
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }
    
    // Admin-Benutzer erstellen
    console.log('[Setup] Hashing password...')
    const hashedPassword = await hashPassword(password)
    
    console.log('[Setup] Creating admin user...')
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    })
    console.log('[Setup] Admin user created with ID:', user.id)
    
    // System-Einstellungen initialisieren
    console.log('[Setup] Creating system settings...')
    await db.systemSettings.upsert({
      where: { id: 'system' },
      update: {
        companyName: companyName || 'Mein Unternehmen',
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
      },
      create: {
        id: 'system',
        companyName: companyName || 'Mein Unternehmen',
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
      },
    })
    console.log('[Setup] System settings created/updated')
    
    console.log('[Setup] Setup completed successfully!')
    return NextResponse.json({
      success: true,
      message: 'Admin-Benutzer wurde erstellt',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[Setup] Error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte pruefen Sie die Datenbankverbindung.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('[Setup] GET - Checking if setup is needed...')
    const userCount = await db.user.count()
    console.log('[Setup] GET - User count:', userCount)
    const needsSetup = userCount === 0
    console.log('[Setup] GET - needsSetup:', needsSetup)
    return NextResponse.json({ needsSetup })
  } catch (error) {
    console.error('[Setup] GET - Database error:', error)
    // Bei Datenbankfehler Setup anzeigen
    return NextResponse.json({ needsSetup: true })
  }
}
