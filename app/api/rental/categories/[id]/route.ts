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

    const category = await db.rentalCategory.findUnique({
      where: { id },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { items: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && category.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error fetching rental category:', error)
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

    // Check if category exists and belongs to company
    const existing = await db.rentalCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Kategorien bearbeiten
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const category = await db.rentalCategory.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'UPDATE',
        entity: 'RentalCategory',
        entityId: category.id,
        details: `Mietkategorie "${category.name}" aktualisiert`,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating rental category:', error)
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

    // Check if category exists and belongs to company
    const existing = await db.rentalCategory.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }
    if (session.role !== 'SUPERADMIN' && existing.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Nur ADMIN, MANAGER, OWNER koennen Kategorien loeschen
    if (session.companyRole && !['OWNER', 'ADMIN', 'MANAGER'].includes(session.companyRole)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Check if category has items
    if (existing._count.items > 0) {
      return NextResponse.json(
        { error: 'Kategorie kann nicht geloescht werden, da noch Mietobjekte zugeordnet sind' },
        { status: 400 }
      )
    }

    await db.rentalCategory.delete({ where: { id } })

    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'DELETE',
        entity: 'RentalCategory',
        entityId: id,
        details: `Mietkategorie "${existing.name}" geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rental category:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
