import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Diese Route macht den ersten Benutzer oder den aktuell eingeloggten Benutzer zum Superadmin
// WICHTIG: Nach dem ersten Gebrauch sollte diese Route deaktiviert werden!

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    // Pruefe ob bereits ein Superadmin existiert
    const existingSuperadmin = await db.user.findFirst({
      where: { role: 'SUPERADMIN' },
    })
    
    if (existingSuperadmin) {
      return NextResponse.json(
        { error: 'Es existiert bereits ein Superadmin. Diese Route ist deaktiviert.' },
        { status: 403 }
      )
    }
    
    // Wenn eingeloggt, mache den aktuellen Benutzer zum Superadmin
    if (session?.userId) {
      const user = await db.user.update({
        where: { id: session.userId },
        data: { role: 'SUPERADMIN' },
      })
      
      return NextResponse.json({
        success: true,
        message: `Benutzer ${user.email} wurde zum Superadmin ernannt. Bitte neu einloggen!`,
      })
    }
    
    // Wenn nicht eingeloggt, mache den ersten Benutzer zum Superadmin
    const firstUser = await db.user.findFirst({
      orderBy: { createdAt: 'asc' },
    })
    
    if (!firstUser) {
      return NextResponse.json(
        { error: 'Keine Benutzer in der Datenbank gefunden.' },
        { status: 404 }
      )
    }
    
    const user = await db.user.update({
      where: { id: firstUser.id },
      data: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      success: true,
      message: `Benutzer ${user.email} wurde zum Superadmin ernannt. Bitte einloggen!`,
    })
    
  } catch (error) {
    console.error('Error making superadmin:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Superadmins' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Pruefe ob bereits ein Superadmin existiert
    const existingSuperadmin = await db.user.findFirst({
      where: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      hasSuperadmin: !!existingSuperadmin,
      superadminEmail: existingSuperadmin?.email || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Pruefen' },
      { status: 500 }
    )
  }
}
