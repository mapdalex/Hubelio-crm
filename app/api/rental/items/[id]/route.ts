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

    const item = await db.rentalItem.findUnique({
      where: { id },
      include: {
        category: true,
        bookings: {
          orderBy: { startDate: 'desc' },
          take: 10,
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
        },
        _count: {
          select: { bookings: true },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }

    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && item.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check current availability
    const now = new Date()
    const activeBooking = await db.rentalBooking.findFirst({
      where: {
        itemId: id,
        startDate: { lte: now },
        endDate: { gte: now },
        status: { in: ['CONFIRMED', 'ACTIVE'] },
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
    })

    return NextResponse.json({
      item: {
        ...item,
        isAvailable: !activeBooking,
        currentBooking: activeBooking,
      },
    })
  } catch (error) {
    console.error('Error fetching rental item:', error)
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

    // Check if item exists and belongs to company
    const existing = await db.rentalItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Items bearbeiten
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Validate categoryId if changed
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await db.rentalCategory.findUnique({
        where: { id: data.categoryId },
      })
      if (!category) {
        return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 400 })
      }
      if (session.role !== 'SUPERADMIN' && category.companyId !== session.companyId) {
        return NextResponse.json({ error: 'Keine Berechtigung fuer diese Kategorie' }, { status: 403 })
      }
    }

    const item = await db.rentalItem.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        location: data.location,
        image: data.image,
        pricePerHour: data.pricePerHour,
        pricePerDay: data.pricePerDay,
        pricePerWeek: data.pricePerWeek,
        pricePerMonth: data.pricePerMonth,
        currency: data.currency,
        features: data.features,
        notes: data.notes,
        cleaningDays: data.cleaningDays != null ? parseInt(data.cleaningDays) : null,
        isActive: data.isActive,
      },
      include: {
        category: true,
      },
    })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'UPDATE',
        entity: 'RentalItem',
        entityId: item.id,
        details: `Mietobjekt "${item.name}" aktualisiert`,
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating rental item:', error)
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

    // Check if item exists and belongs to company
    const existing = await db.rentalItem.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Items loeschen
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check if item has active bookings
    const activeBookings = await db.rentalBooking.count({
      where: {
        itemId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
      },
    })

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: 'Mietobjekt kann nicht geloescht werden, da noch aktive Buchungen existieren' },
        { status: 400 }
      )
    }

    await db.rentalItem.delete({ where: { id } })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'DELETE',
        entity: 'RentalItem',
        entityId: id,
        details: `Mietobjekt "${existing.name}" geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rental item:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
