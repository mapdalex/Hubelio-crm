import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'

// Helper to generate booking number
async function generateBookingNumber(companyId: string | undefined): Promise<string> {
  const prefix = 'BK'
  const lastBooking = await db.rentalBooking.findFirst({
    where: companyId ? { companyId } : undefined,
    orderBy: { bookingNumber: 'desc' },
  })

  let nextNumber = 1
  if (lastBooking) {
    const match = lastBooking.bookingNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0]) + 1
    }
  }

  return `${prefix}${nextNumber.toString().padStart(6, '0')}`
}

// Helper to calculate total price
function calculateTotalPrice(
  item: { pricePerHour: Decimal | null; pricePerDay: Decimal | null; pricePerWeek: Decimal | null; pricePerMonth: Decimal | null },
  startDate: Date,
  endDate: Date
): number | null {
  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const days = Math.ceil(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  // Try to use the most cost-effective pricing
  if (months >= 1 && item.pricePerMonth) {
    const remainingDays = days - months * 30
    const monthCost = Number(item.pricePerMonth) * months
    const daysCost = item.pricePerDay ? Number(item.pricePerDay) * remainingDays : 0
    return monthCost + daysCost
  }

  if (weeks >= 1 && item.pricePerWeek) {
    const remainingDays = days - weeks * 7
    const weekCost = Number(item.pricePerWeek) * weeks
    const daysCost = item.pricePerDay ? Number(item.pricePerDay) * remainingDays : 0
    return weekCost + daysCost
  }

  if (days >= 1 && item.pricePerDay) {
    return Number(item.pricePerDay) * days
  }

  if (item.pricePerHour) {
    return Number(item.pricePerHour) * Math.ceil(hours)
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const itemId = searchParams.get('itemId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const startDateFrom = searchParams.get('startDateFrom')
    const startDateTo = searchParams.get('startDateTo')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Multi-tenant filter
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    }

    // Filters
    if (itemId) where.itemId = itemId
    if (customerId) where.customerId = customerId
    if (status) where.status = status
    if (startDateFrom) where.startDate = { gte: new Date(startDateFrom) }
    if (startDateTo) {
      where.startDate = { ...where.startDate, lte: new Date(startDateTo) }
    }

    const [bookings, total] = await Promise.all([
      db.rentalBooking.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              image: true,
              category: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      db.rentalBooking.count({ where }),
    ])

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching rental bookings:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const data = await request.json()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    // Validate dates
    if (startDate >= endDate) {
      return NextResponse.json({ error: 'Enddatum muss nach Startdatum liegen' }, { status: 400 })
    }

    // Validate item (include cleaningDays)
    const item = await db.rentalItem.findUnique({
      where: { id: data.itemId },
    })
    if (!item) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 400 })
    }
    if (session.role !== 'SUPERADMIN' && item.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung fuer dieses Mietobjekt' }, { status: 403 })
    }
    if (!item.isActive) {
      return NextResponse.json({ error: 'Mietobjekt ist nicht aktiv' }, { status: 400 })
    }

    // Validate customer
    const customer = await db.customer.findUnique({
      where: { id: data.customerId },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 400 })
    }
    if (session.role !== 'SUPERADMIN' && customer.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung fuer diesen Kunden' }, { status: 403 })
    }

    // Check for overlapping bookings
    const overlappingBooking = await db.rentalBooking.findFirst({
      where: {
        itemId: data.itemId,
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

    // Calculate total price if not provided
    const totalPrice = data.totalPrice ?? calculateTotalPrice(item, startDate, endDate)

    // Generate booking number
    const bookingNumber = await generateBookingNumber(session.companyId)

    // Create booking
    const booking = await db.rentalBooking.create({
      data: {
        bookingNumber,
        companyId: session.companyId || null,
        itemId: data.itemId,
        customerId: data.customerId,
        startDate,
        endDate,
        totalPrice,
        currency: data.currency || item.currency || 'EUR',
        status: data.status || 'PENDING',
        notes: data.notes || null,
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

    // Create calendar event if requested
    if (data.createCalendarEvent) {
      // Find or create rental calendar
      let rentalCalendar = await db.calendar.findFirst({
        where: { companyId: session.companyId, type: 'RENTAL' },
      })
      if (!rentalCalendar) {
        rentalCalendar = await db.calendar.create({
          data: {
            companyId: session.companyId,
            name: 'Vermietungen',
            description: 'Kalender fuer Mietobjekt-Buchungen',
            color: '#ef4444',
            type: 'RENTAL',
            isPublic: true,
          },
        })
      }

      const calendarEvent = await db.calendarEvent.create({
        data: {
          calendarId: rentalCalendar.id,
          title: `${item.name} - ${customer.firstName} ${customer.lastName}`,
          description: `Buchung: ${bookingNumber}\nKunde: ${customer.companyName || `${customer.firstName} ${customer.lastName}`}\n${data.notes || ''}`,
          eventType: 'RENTAL',
          startDate,
          endDate,
          allDay: true,
          color: '#ef4444',
          createdById: session.userId,
        },
      })

      // Update booking with calendar event reference
      await db.rentalBooking.update({
        where: { id: booking.id },
        data: { calendarEventId: calendarEvent.id },
      })

      // Create cleaning calendar event if item has cleaningDays configured
      if (item.cleaningDays && item.cleaningDays > 0) {
        // Find or create cleaning calendar
        let cleaningCalendar = await db.calendar.findFirst({
          where: { companyId: session.companyId, type: 'RENTAL_CLEANING' },
        })
        if (!cleaningCalendar) {
          cleaningCalendar = await db.calendar.create({
            data: {
              companyId: session.companyId,
              name: 'Reinigung',
              description: 'Reinigungskalender fuer Mietobjekte',
              color: '#f59e0b', // amber for cleaning
              type: 'RENTAL_CLEANING',
              isPublic: true,
            },
          })
        }

        const cleaningStart = new Date(endDate)
        const cleaningEnd = new Date(endDate)
        cleaningEnd.setDate(cleaningEnd.getDate() + item.cleaningDays)

        await db.calendarEvent.create({
          data: {
            calendarId: cleaningCalendar.id,
            title: `Reinigung: ${item.name}`,
            description: `Reinigung nach Buchung ${bookingNumber}\nDauer: ${item.cleaningDays} Tag(e)`,
            eventType: 'RENTAL_CLEANING',
            startDate: cleaningStart,
            endDate: cleaningEnd,
            allDay: true,
            color: '#f59e0b',
            createdById: session.userId,
          },
        })
      }
    }

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'CREATE',
        entity: 'RentalBooking',
        entityId: booking.id,
        details: `Buchung ${bookingNumber} fuer "${item.name}" erstellt`,
      },
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error('Error creating rental booking:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
