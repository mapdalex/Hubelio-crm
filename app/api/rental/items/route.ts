import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')
    const isActiveParam = searchParams.get('isActive')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Multi-tenant filter
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId
    }

    // Status filter
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      db.rentalItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      db.rentalItem.count({ where }),
    ])

    // Check availability for each item (is there an active booking right now?)
    const now = new Date()
    const itemIds = items.map((item) => item.id)
    
    const activeBookings = await db.rentalBooking.findMany({
      where: {
        itemId: { in: itemIds },
        startDate: { lte: now },
        endDate: { gte: now },
        status: { in: ['CONFIRMED', 'ACTIVE'] },
      },
      select: { itemId: true },
    })

    const occupiedItemIds = new Set(activeBookings.map((b) => b.itemId))

    const itemsWithAvailability = items.map((item) => ({
      ...item,
      isAvailable: !occupiedItemIds.has(item.id),
    }))

    return NextResponse.json({
      items: itemsWithAvailability,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching rental items:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Items erstellen
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const data = await request.json()

    // Validate categoryId
    const category = await db.rentalCategory.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 400 })
    }
    if (session.role !== 'SUPERADMIN' && category.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung fuer diese Kategorie' }, { status: 403 })
    }

    const item = await db.rentalItem.create({
      data: {
        companyId: session.companyId || null,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        image: data.image || null,
        pricePerHour: data.pricePerHour || null,
        pricePerDay: data.pricePerDay || null,
        pricePerWeek: data.pricePerWeek || null,
        pricePerMonth: data.pricePerMonth || null,
        currency: data.currency || 'EUR',
        features: data.features || [],
        notes: data.notes || null,
        cleaningDays: data.cleaningDays != null ? parseInt(data.cleaningDays) : null,
        isActive: data.isActive !== false,
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
        action: 'CREATE',
        entity: 'RentalItem',
        entityId: item.id,
        details: `Mietobjekt "${item.name}" erstellt`,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error creating rental item:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
