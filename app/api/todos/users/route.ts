import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isSuperAdmin } from '@/lib/auth'

// GET /api/todos/users - Lädt nur User innerhalb der eigenen Firma
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Wenn kein companyId in der Session, kann der User keine Firmen-User sehen
    if (!session.companyId) {
      // Superadmin ohne Firma sieht sich selbst
      if (isSuperAdmin(session.role)) {
        const superadmin = await db.user.findUnique({
          where: { id: session.userId },
          select: { id: true, name: true, email: true },
        })
        return NextResponse.json(superadmin ? [superadmin] : [])
      }
      return NextResponse.json([])
    }

    // Alle User finden, die Mitglied dieser Firma sind
    const companyUsers = await db.companyUser.findMany({
      where: {
        companyId: session.companyId,
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    // User-Daten extrahieren
    const users = companyUsers.map((cm) => ({
      id: cm.user.id,
      name: cm.user.name,
      email: cm.user.email,
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching company users:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 })
  }
}
