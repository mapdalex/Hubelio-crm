import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Diese Route macht den aktuell eingeloggten Benutzer zum Superadmin
// NUR verfuegbar wenn noch KEIN Superadmin existiert

export async function POST() {
  try {
    // Pruefe ob bereits ein Superadmin existiert
    const existingSuperadmin = await db.user.findFirst({
      where: { role: 'SUPERADMIN' },
    })
    
    if (existingSuperadmin) {
      return NextResponse.json(
        { error: 'Es existiert bereits ein Superadmin. Diese Funktion ist deaktiviert.' },
        { status: 403 }
      )
    }
    
    // Hole aktuelle Session
    const session = await getSession()
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Sie muessen eingeloggt sein.' },
        { status: 401 }
      )
    }
    
    // Mache den aktuellen Benutzer zum Superadmin
    const user = await db.user.update({
      where: { id: session.userId },
      data: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      success: true,
      message: `${user.email} wurde zum Superadmin ernannt. Bitte laden Sie die Seite neu oder loggen Sie sich neu ein.`,
    })
    
  } catch (error) {
    console.error('Upgrade error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Upgrade' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const existingSuperadmin = await db.user.findFirst({
      where: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      hasSuperadmin: !!existingSuperadmin,
      superadminEmail: existingSuperadmin?.email || null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}
