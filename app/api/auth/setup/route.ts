import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// Diese Route erstellt den ersten Admin-Benutzer
// Nur verfügbar wenn noch keine Benutzer existieren
export async function POST(request: NextRequest) {
  try {
    // Pruefen ob bereits Benutzer existieren
    const userCount = await db.user.count()
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Setup bereits abgeschlossen' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { email, password, name, companyName, companyEmail, companyPhone } = body
    
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }
    
    // Admin-Benutzer erstellen
    const hashedPassword = await hashPassword(password)
    
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    })
    
    // System-Einstellungen initialisieren
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
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}
