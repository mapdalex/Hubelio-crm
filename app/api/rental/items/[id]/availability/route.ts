import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'

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
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') // Format: YYYY-MM

    // Check if item exists and belongs to company
    const item = await db.rentalItem.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && item.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // If checking specific date range
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Find overlapping bookings
      const overlappingBookings = await db.rentalBooking.findMany({
        where: {
          itemId: id,
          status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
          OR: [
            {
              // Booking starts during requested period
              startDate: { gte: start, lte: end },
            },
            {
              // Booking ends during requested period
              endDate: { gte: start, lte: end },
            },
            {
              // Booking spans entire requested period
              startDate: { lte: start },
              endDate: { gte: end },
            },
          ],
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      })

      return NextResponse.json({
        isAvailable: overlappingBookings.length === 0,
        conflictingBookings: overlappingBookings,
      })
    }

    // If getting monthly availability
    let queryStart: Date
    let queryEnd: Date

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      queryStart = new Date(year, monthNum - 1, 1)
      queryEnd = new Date(year, monthNum, 0, 23, 59, 59) // Last day of month
    } else {
      // Default: next 30 days
      queryStart = new Date()
      queryEnd = new Date()
      queryEnd.setDate(queryEnd.getDate() + 30)
    }

    // Get all bookings in the period
    const bookings = await db.rentalBooking.findMany({
      where: {
        itemId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        OR: [
          {
            startDate: { gte: queryStart, lte: queryEnd },
          },
          {
            endDate: { gte: queryStart, lte: queryEnd },
          },
          {
            startDate: { lte: queryStart },
            endDate: { gte: queryEnd },
          },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    // Create availability map for each day
    const availability: { date: string; isAvailable: boolean; booking?: { id: string; customer: { id: string; firstName: string; lastName: string; companyName: string | null } } }[] = []
    const currentDate = new Date(queryStart)
    
    while (currentDate <= queryEnd) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const overlappingBooking = bookings.find(
        (b) => new Date(b.startDate) <= dayEnd && new Date(b.endDate) >= dayStart
      )

      availability.push({
        date: dateStr,
        isAvailable: !overlappingBooking,
        booking: overlappingBooking
          ? {
              id: overlappingBooking.id,
              customer: overlappingBooking.customer,
            }
          : undefined,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
      },
      period: {
        start: queryStart.toISOString(),
        end: queryEnd.toISOString(),
      },
      availability,
      bookings,
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json({ error: 'Fehler beim Pruefen der Verfuegbarkeit' }, { status: 500 })
  }
}
