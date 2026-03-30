import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Temporaere Route um den aktuellen Benutzer zum Superadmin zu machen
// NUR EINMALIG VERWENDEN - danach diese Datei loeschen!
export async function POST() {
  try {
    const session = await getSession()
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }
    
    // Pruefe ob bereits ein Superadmin existiert
    const existingSuperadmin = await db.user.findFirst({
      where: { role: 'SUPERADMIN' },
    })
    
    if (existingSuperadmin && existingSuperadmin.id !== session.userId) {
      return NextResponse.json(
        { error: 'Es existiert bereits ein Superadmin' },
        { status: 400 }
      )
    }
    
    // Aktuellen Benutzer zum Superadmin machen
    const user = await db.user.update({
      where: { id: session.userId },
      data: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      success: true,
      message: 'Sie sind jetzt Superadmin! Bitte Seite neu laden.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Fix superadmin error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getSession()
    const superadminCount = await db.user.count({
      where: { role: 'SUPERADMIN' },
    })
    
    return NextResponse.json({
      loggedIn: !!session?.userId,
      hasSuperadmin: superadminCount > 0,
      canUpgrade: session?.userId && superadminCount === 0,
    })
  } catch {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 })
  }
}
