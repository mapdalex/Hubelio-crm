import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH: Sichtbarkeit umschalten (ein-/ausblenden)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const { isVisible } = await request.json()

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: 'isVisible muss ein Boolean sein' }, { status: 400 })
    }

    // Pruefe ob User Zugriff auf Kalender hat
    const calendar = await db.calendar.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.userId },
          { shares: { some: { userId: session.userId } } },
          ...(session.companyId ? [{ companyId: session.companyId, isPublic: true }] : [])
        ]
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden' }, { status: 404 })
    }

    // Erstelle oder aktualisiere Sichtbarkeits-Einstellung
    const visibility = await db.calendarVisibility.upsert({
      where: {
        userId_calendarId: {
          userId: session.userId,
          calendarId: id
        }
      },
      create: {
        userId: session.userId,
        calendarId: id,
        isVisible
      },
      update: {
        isVisible
      }
    })

    return NextResponse.json(visibility)
  } catch (error) {
    console.error('Fehler beim Aendern der Sichtbarkeit:', error)
    return NextResponse.json({ error: 'Fehler beim Aendern der Sichtbarkeit' }, { status: 500 })
  }
}
