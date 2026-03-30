import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { generateUniqueSlug } from '@/lib/multi-tenant'

// Diese Route erstellt den ersten SUPERADMIN-Benutzer
// Nur verfügbar wenn noch keine Benutzer existieren
// Der SUPERADMIN kann Firmen und deren Admins erstellen
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
    
    // SUPERADMIN-Benutzer erstellen (erster Benutzer wird zum Superadmin)
    const hashedPassword = await hashPassword(password)
    
    const result = await db.$transaction(async (tx) => {
      // Superadmin erstellen
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: 'SUPERADMIN', // Erster Benutzer wird SUPERADMIN
        },
      })
      
      // Wenn Firmenname angegeben, Firma erstellen und Superadmin als Owner hinzufuegen
      let company = null
      if (companyName) {
        const slug = await generateUniqueSlug(companyName)
        
        company = await tx.company.create({
          data: {
            name: companyName,
            slug,
            email: companyEmail || null,
            phone: companyPhone || null,
          },
        })
        
        // Superadmin als Owner der Firma hinzufuegen
        await tx.companyUser.create({
          data: {
            userId: user.id,
            companyId: company.id,
            role: 'OWNER',
            isDefault: true,
          },
        })
        
        // CORE Modul fuer Firma abonnieren
        const coreModule = await tx.module.findUnique({
          where: { moduleId: 'CORE' },
        })
        
        if (coreModule) {
          await tx.subscription.create({
            data: {
              companyId: company.id,
              moduleId: coreModule.id,
              tier: 'FREE',
              status: 'ACTIVE',
            },
          })
        }
      }
      
      // System-Einstellungen initialisieren
      await tx.systemSettings.upsert({
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
      
      return { user, company }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Superadmin-Benutzer wurde erstellt',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      company: result.company ? {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
      } : null,
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
