import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET: Kalender-Details
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

    const calendar = await db.calendar.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.userId },
          { shares: { some: { userId: session.userId } } },
          ...(session.companyId ? [{ companyId: session.companyId, isPublic: true }] : [])
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Fehler beim Laden des Kalenders:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Kalenders' }, { status: 500 })
  }
}

// PATCH: Kalender aktualisieren
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
    const data = await request.json()

    // Pruefe Berechtigung
    const existingCalendar = await db.calendar.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.userId },
          { shares: { some: { userId: session.userId, canEdit: true } } },
          ...(session.companyId && ['ADMIN', 'SUPERADMIN'].includes(session.role) ? [
            { companyId: session.companyId, type: { in: ['COMPANY', 'VACATION'] } }
          ] : [])
        ]
      }
    })

    if (!existingCalendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    const { name, description, color, isPublic } = data

    const calendar = await db.calendar.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isPublic !== undefined && { isPublic })
      }
    })

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kalenders:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Kalenders' }, { status: 500 })
  }
}

// DELETE: Kalender loeschen
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

    // Nur der Owner oder Admin kann loeschen
    const existingCalendar = await db.calendar.findFirst({
      where: {
        id,
        OR: [
          { ownerId: session.userId },
          ...(session.companyId && ['ADMIN', 'SUPERADMIN'].includes(session.role) ? [
            { companyId: session.companyId }
          ] : [])
        ]
      }
    })

    if (!existingCalendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    // Default-Kalender koennen nicht geloescht werden
    if (existingCalendar.isDefault) {
      return NextResponse.json({ error: 'Standard-Kalender koennen nicht geloescht werden' }, { status: 400 })
    }

    await db.calendar.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Loeschen des Kalenders:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen des Kalenders' }, { status: 500 })
  }
}
