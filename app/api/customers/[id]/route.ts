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
    
    // Multi-tenant: Nur Kunden der eigenen Firma abrufen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.companyId = session.companyId
    }
    
    const customer = await db.customer.findFirst({
      where: whereClause,
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        computers: { orderBy: { name: 'asc' } },
        domains: { orderBy: { domainName: 'asc' } },
        services: { orderBy: { name: 'asc' } },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { assignedTo: true },
        },
        files: { orderBy: { createdAt: 'desc' } },
      },
    })
    
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }
    
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
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
    
    // Multi-tenant: Pruefen ob Kunde zur eigenen Firma gehoert
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingCustomer = await db.customer.findFirst({
        where: { id, companyId: session.companyId }
      })
      if (!existingCustomer) {
        return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
      }
    }
    
    const customer = await db.customer.update({
      where: { id },
      data: {
        companyName: data.company ?? data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        street: data.street,
        zipCode: data.zipCode,
        city: data.city,
        country: data.country,
        notes: data.notes,
        isActive: data.isActive,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: customer.id,
        details: `Kunde ${customer.customerNumber} aktualisiert`,
      },
    })
    
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Multi-tenant: Pruefen ob Kunde zur eigenen Firma gehoert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.companyId = session.companyId
    }
    
    const customer = await db.customer.findFirst({ where: whereClause })
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }
    
    await db.customer.delete({ where: { id } })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entity: 'Customer',
        entityId: id,
        details: `Kunde ${customer.customerNumber} geloescht`,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
