import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET: Freigaben anzeigen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Pruefe ob User Zugriff auf Kalender hat
    const calendar = await db.calendar.findFirst({
      where: {
        id,
        ownerId: session.userId
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    const shares = await db.calendarShare.findMany({
      where: { calendarId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(shares)
  } catch (error) {
    console.error('Fehler beim Laden der Freigaben:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Freigaben' }, { status: 500 })
  }
}

// POST: Kalender freigeben
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const { userId, canEdit } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User-ID ist erforderlich' }, { status: 400 })
    }

    // Pruefe ob User der Owner ist
    const calendar = await db.calendar.findFirst({
      where: {
        id,
        ownerId: session.userId
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    // Kann nicht mit sich selbst teilen
    if (userId === session.userId) {
      return NextResponse.json({ error: 'Kalender kann nicht mit sich selbst geteilt werden' }, { status: 400 })
    }

    // Pruefe ob User zur gleichen Firma gehoert
    if (session.companyId) {
      const targetUser = await db.companyUser.findFirst({
        where: {
          userId,
          companyId: session.companyId
        }
      })

      if (!targetUser) {
        return NextResponse.json({ error: 'User gehoert nicht zur gleichen Firma' }, { status: 400 })
      }
    }

    // Erstelle oder aktualisiere Freigabe
    const share = await db.calendarShare.upsert({
      where: {
        calendarId_userId: {
          calendarId: id,
          userId
        }
      },
      create: {
        calendarId: id,
        userId,
        canEdit: canEdit || false
      },
      update: {
        canEdit: canEdit || false
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(share, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Freigeben des Kalenders:', error)
    return NextResponse.json({ error: 'Fehler beim Freigeben des Kalenders' }, { status: 500 })
  }
}

// DELETE: Freigabe entfernen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User-ID ist erforderlich' }, { status: 400 })
    }

    // Pruefe ob User der Owner ist
    const calendar = await db.calendar.findFirst({
      where: {
        id,
        ownerId: session.userId
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    await db.calendarShare.delete({
      where: {
        calendarId_userId: {
          calendarId: id,
          userId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Entfernen der Freigabe:', error)
    return NextResponse.json({ error: 'Fehler beim Entfernen der Freigabe' }, { status: 500 })
  }
}
