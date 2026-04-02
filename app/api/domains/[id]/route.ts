import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Multi-tenant: Domain über Customer->companyId filtern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    }

    const domain = await db.domain.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, customerNumber: true, companyName: true, firstName: true, lastName: true, companyId: true },
        },
      },
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ domain })
  } catch (error) {
    console.error('Error fetching domain:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PATCH(
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

    // Multi-tenant: Pruefen ob Domain zur eigenen Firma gehoert (über Customer)
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingDomain = await db.domain.findFirst({
        where: { id, customer: { companyId: session.companyId } }
      })
      if (!existingDomain) {
        return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 })
      }
    }

    const domain = await db.domain.update({
      where: { id },
      data: {
        domainName: data.domainName,
        registrar: data.registrar || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenew: data.autoRenew ?? undefined,
        costPrice: data.costPrice != null ? parseFloat(data.costPrice) : null,
        sellPrice: data.sellPrice != null ? parseFloat(data.sellPrice) : null,
        billingCycle: data.billingCycle || null,
        status: data.status || undefined,
        notes: data.notes || null,
      },
    })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entity: 'Domain',
        entityId: domain.id,
        details: `Domain ${domain.domainName} aktualisiert`,
      },
    })

    return NextResponse.json({ domain })
  } catch (error) {
    console.error('Error updating domain:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    // Multi-tenant: Pruefen ob Domain zur eigenen Firma gehoert (über Customer)
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingDomain = await db.domain.findFirst({
        where: { id, customer: { companyId: session.companyId } }
      })
      if (!existingDomain) {
        return NextResponse.json({ error: 'Domain nicht gefunden' }, { status: 404 })
      }
    }

    const domain = await db.domain.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entity: 'Domain',
        entityId: id,
        details: `Domain ${domain.domainName} geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting domain:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
