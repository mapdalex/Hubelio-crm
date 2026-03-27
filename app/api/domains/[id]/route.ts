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

    const domain = await db.domain.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, customerNumber: true, company: true, firstName: true, lastName: true },
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
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

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
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

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
