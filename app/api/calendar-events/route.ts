import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

// GET: Events in Zeitraum (mit Filter nach sichtbaren Kalendern)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const calendarId = searchParams.get('calendarId')

    // Hole sichtbare Kalender-IDs
    const visibleCalendars = await db.calendar.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { shares: { some: { userId: session.userId } } },
          ...(session.companyId ? [{ companyId: session.companyId, isPublic: true }] : [])
        ]
      },
      include: {
        visibility: {
          where: { userId: session.userId }
        }
      }
    })

    // Filtere auf sichtbare Kalender
    const visibleCalendarIds = visibleCalendars
      .filter(cal => cal.visibility[0]?.isVisible !== false)
      .map(cal => cal.id)

    if (calendarId && !visibleCalendarIds.includes(calendarId)) {
      return NextResponse.json([])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      calendarId: calendarId ? calendarId : { in: visibleCalendarIds }
    }

    // Zeitraum-Filter
    if (start && end) {
      where.OR = [
        // Event startet im Zeitraum
        {
          startDate: {
            gte: new Date(start),
            lte: new Date(end)
          }
        },
        // Event endet im Zeitraum
        {
          endDate: {
            gte: new Date(start),
            lte: new Date(end)
          }
        },
        // Event umspannt den Zeitraum
        {
          startDate: { lte: new Date(start) },
          endDate: { gte: new Date(end) }
        }
      ]
    }

    const events = await db.calendarEvent.findMany({
      where,
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
      },
      orderBy: { startDate: 'asc' }
    })

    // Fuege effektive Farbe hinzu (Event-Farbe oder Kalender-Farbe)
    const formattedEvents = events.map(event => ({
      ...event,
      effectiveColor: event.color || event.calendar.color
    }))

    return NextResponse.json(formattedEvents)
  } catch (error) {
    console.error('Fehler beim Laden der Events:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Events' }, { status: 500 })
  }
}

// POST: Neues Event erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const data = await request.json()
    const {
      calendarId,
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

    if (!calendarId || !title || !startDate || !endDate) {
      return NextResponse.json({ error: 'calendarId, title, startDate und endDate sind erforderlich' }, { status: 400 })
    }

    // Pruefe Berechtigung fuer Kalender
    const calendar = await db.calendar.findFirst({
      where: {
        id: calendarId,
        OR: [
          { ownerId: session.userId },
          { shares: { some: { userId: session.userId, canEdit: true } } },
          // Jeder kann im Urlaubskalender seinen Urlaub eintragen
          ...(session.companyId ? [{ companyId: session.companyId, type: 'VACATION' }] : []),
          // Admins koennen in Firmenkalender schreiben
          ...(session.companyId && ['ADMIN', 'SUPERADMIN'].includes(session.role) ? [
            { companyId: session.companyId, type: 'COMPANY' }
          ] : [])
        ]
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Kalender nicht gefunden oder keine Berechtigung' }, { status: 404 })
    }

    // Event erstellen
    const event = await db.calendarEvent.create({
      data: {
        calendarId,
        title,
        description: description || null,
        location: location || null,
        eventType: eventType || 'EVENT',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        allDay: allDay || false,
        color: color || null,
        createdById: session.userId,
        ...(attendeeIds && attendeeIds.length > 0 && {
          attendees: {
            create: attendeeIds.map((userId: string) => ({
              userId,
              status: 'pending'
            }))
          }
        })
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

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Events:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Events' }, { status: 500 })
  }
}
