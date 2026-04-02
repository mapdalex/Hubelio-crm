import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Multi-tenant: Service über Customer->companyId filtern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    }

    const service = await db.service.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, customerNumber: true, companyName: true, firstName: true, lastName: true, companyId: true },
        },
      },
    })

    if (!service) {
      return NextResponse.json({ error: 'Service nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Multi-tenant: Pruefen ob Service zur eigenen Firma gehoert (über Customer)
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingService = await db.service.findFirst({
        where: { id, customer: { companyId: session.companyId } }
      })
      if (!existingService) {
        return NextResponse.json({ error: 'Service nicht gefunden' }, { status: 404 })
      }
    }

    const service = await db.service.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        billingCycle: data.billingCycle || null,
        costPrice: data.costPrice != null ? parseFloat(data.costPrice) : null,
        sellPrice: data.sellPrice != null ? parseFloat(data.sellPrice) : null,
        status: data.status || undefined,
        notes: data.notes || null,
      },
    })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entity: 'Service',
        entityId: service.id,
        details: `Service ${service.name} aktualisiert`,
      },
    })

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Multi-tenant: Pruefen ob Service zur eigenen Firma gehoert (über Customer)
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingService = await db.service.findFirst({
        where: { id, customer: { companyId: session.companyId } }
      })
      if (!existingService) {
        return NextResponse.json({ error: 'Service nicht gefunden' }, { status: 404 })
      }
    }

    const service = await db.service.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entity: 'Service',
        entityId: id,
        details: `Service ${service.name} geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
