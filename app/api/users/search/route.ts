import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'

// GET: Suche nach Usern in der Firma (fuer Kalender-Freigabe)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Suche nach Usern in der gleichen Firma
    // Verwende companyId aus Session fuer Multi-Tenant Filter
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          },
          // Nur User aus der gleichen Firma
          ...(session.companyId ? [{
            companyUsers: {
              some: {
                companyId: session.companyId
              }
            }
          }] : []),
          // Nicht den aktuellen User
          { id: { not: session.userId } },
          // Nur aktive User
          { isActive: true },
          // Nur Mitarbeiter (keine Kunden/Gaeste)
          { role: { in: ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'] } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 10,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Fehler bei der Usersuche:', error)
    return NextResponse.json({ error: 'Fehler bei der Suche' }, { status: 500 })
  }
}
