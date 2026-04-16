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
    const isActiveParam = searchParams.get('isActive')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Multi-tenant filter
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    }

    // Status filter
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    const categories = await db.rentalCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching rental categories:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Kategorien erstellen
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const data = await request.json()

    // Naechste sortOrder ermitteln
    const lastCategory = await db.rentalCategory.findFirst({
      where: { companyId: session.companyId || undefined },
      orderBy: { sortOrder: 'desc' },
    })
    const nextSortOrder = (lastCategory?.sortOrder || 0) + 1

    const category = await db.rentalCategory.create({
      data: {
        companyId: session.companyId || null,
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || '#3b82f6',
        sortOrder: nextSortOrder,
        isActive: data.isActive !== false,
      },
    })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'CREATE',
        entity: 'RentalCategory',
        entityId: category.id,
        details: `Mietkategorie "${category.name}" erstellt`,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating rental category:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
