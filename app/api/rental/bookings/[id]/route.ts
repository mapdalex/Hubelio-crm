import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const booking = await db.rentalBooking.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        customer: true,
        calendarEvent: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && booking.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Error fetching rental booking:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Check if booking exists and belongs to company
    const existing = await db.rentalBooking.findUnique({
      where: { id },
      include: { item: true, calendarEvent: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Can only edit PENDING bookings (dates), but can always change status and notes
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate

    // Validate dates
    if (startDate >= endDate) {
      return NextResponse.json({ error: 'Enddatum muss nach Startdatum liegen' }, { status: 400 })
    }

    // Check for overlapping bookings (excluding current booking)
    if (data.startDate || data.endDate) {
      const overlappingBooking = await db.rentalBooking.findFirst({
        where: {
          id: { not: id },
          itemId: existing.itemId,
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
          OR: [
            {
              startDate: { gte: startDate, lt: endDate },
            },
            {
              endDate: { gt: startDate, lte: endDate },
            },
            {
              startDate: { lte: startDate },
              endDate: { gte: endDate },
            },
          ],
        },
      })

      if (overlappingBooking) {
        return NextResponse.json(
          { error: 'Mietobjekt ist im gewaehlten Zeitraum bereits gebucht' },
          { status: 400 }
        )
      }
    }

    const booking = await db.rentalBooking.update({
      where: { id },
      data: {
        startDate,
        endDate,
        totalPrice: data.totalPrice,
        status: data.status,
        notes: data.notes,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    })

    // Update calendar event if exists
    if (existing.calendarEventId) {
      await db.calendarEvent.update({
        where: { id: existing.calendarEventId },
        data: {
          startDate,
          endDate,
          // Color based on status
          color:
            booking.status === 'CANCELLED'
              ? '#9ca3af' // Gray for cancelled
              : booking.status === 'COMPLETED'
              ? '#22c55e' // Green for completed
              : '#ef4444', // Red for active/confirmed
        },
      })
    }

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'UPDATE',
        entity: 'RentalBooking',
        entityId: booking.id,
        details: `Buchung ${booking.bookingNumber} aktualisiert (Status: ${booking.status})`,
      },
    })

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Error updating rental booking:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Check if booking exists and belongs to company
    const existing = await db.rentalBooking.findUnique({
      where: { id },
      include: { calendarEvent: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Only ADMIN, MANAGER, OWNER can delete bookings
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Cannot delete active bookings
    if (existing.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Aktive Buchungen koennen nicht geloescht werden. Bitte zuerst abschliessen oder stornieren.' },
        { status: 400 }
      )
    }

    // Delete calendar event if exists
    if (existing.calendarEventId) {
      await db.calendarEvent.delete({
        where: { id: existing.calendarEventId },
      }).catch(() => {
        // Ignore if calendar event doesn't exist
      })
    }

    await db.rentalBooking.delete({ where: { id } })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'DELETE',
        entity: 'RentalBooking',
        entityId: id,
        details: `Buchung ${existing.bookingNumber} geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rental booking:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
