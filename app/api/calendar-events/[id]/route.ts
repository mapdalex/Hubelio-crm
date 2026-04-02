import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET: Event-Details
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

    const event = await db.calendarEvent.findFirst({
      where: {
        id,
        calendar: {
          OR: [
            { ownerId: session.userId },
            { shares: { some: { userId: session.userId } } },
            ...(session.companyId ? [{ companyId: session.companyId, isPublic: true }] : [])
          ]
        }
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true, type: true, ownerId: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Fehler beim Laden des Events:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Events' }, { status: 500 })
  }
}

// PATCH: Event aktualisieren
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

    // Pruefe Berechtigung (Ersteller oder Kalender-Editor)
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id,
        OR: [
          { createdById: session.userId },
          {
            calendar: {
              OR: [
                { ownerId: session.userId },
                { shares: { some: { userId: session.userId, canEdit: true } } },
                ...(session.companyId && ['ADMIN', 'SUPERADMIN'].includes(session.role) ? [
                  { companyId: session.companyId, type: { in: ['COMPANY', 'VACATION'] } }
                ] : [])
              ]
            }
          }
        ]
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    const {
      title,
      description,
      location,
      eventType,
      startDate,
      endDate,
      allDay,
      color,
      attendeeIds
    } = data

    // Update Event
    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(eventType && { eventType }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(allDay !== undefined && { allDay }),
        ...(color !== undefined && { color })
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true, type: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    // Update Teilnehmer wenn angegeben
    if (attendeeIds !== undefined) {
      // Loesche alte Teilnehmer
      await db.eventAttendee.deleteMany({
        where: { eventId: id }
      })

      // Fuege neue Teilnehmer hinzu
      if (attendeeIds.length > 0) {
        await db.eventAttendee.createMany({
          data: attendeeIds.map((userId: string) => ({
            eventId: id,
            userId,
            status: 'pending'
          }))
        })
      }
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Events:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Events' }, { status: 500 })
  }
}

// DELETE: Event loeschen
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

    // Pruefe Berechtigung
    const existingEvent = await db.calendarEvent.findFirst({
      where: {
        id,
        OR: [
          { createdById: session.userId },
          {
            calendar: {
              OR: [
                { ownerId: session.userId },
                { shares: { some: { userId: session.userId, canEdit: true } } },
                ...(session.companyId && ['ADMIN', 'SUPERADMIN'].includes(session.role) ? [
                  { companyId: session.companyId, type: { in: ['COMPANY', 'VACATION'] } }
                ] : [])
              ]
            }
          }
        ]
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    await db.calendarEvent.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Loeschen des Events:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen des Events' }, { status: 500 })
  }
}
