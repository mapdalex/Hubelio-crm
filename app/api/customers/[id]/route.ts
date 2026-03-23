import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    
    const customer = await db.customer.findUnique({
      where: { id },
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
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    const data = await request.json()
    
    const customer = await db.customer.update({
      where: { id },
      data: {
        company: data.company,
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
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    
    const customer = await db.customer.findUnique({ where: { id } })
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
