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
    
    const software = await db.software.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            customerNumber: true,
            companyName: true,
            firstName: true,
            lastName: true,
            companyId: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        computer: {
          select: {
            id: true,
            name: true,
            type: true,
            manufacturer: true,
            model: true,
          },
        },
      },
    })
    
    if (!software) {
      return NextResponse.json({ error: 'Software nicht gefunden' }, { status: 404 })
    }
    
    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      if (software.customer && software.customer.companyId !== session.companyId) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ software })
  } catch (error) {
    console.error('Error fetching software:', error)
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
    
    const existingSoftware = await db.software.findUnique({
      where: { id },
      include: { customer: { select: { companyId: true } } },
    })
    
    if (!existingSoftware) {
      return NextResponse.json({ error: 'Software nicht gefunden' }, { status: 404 })
    }
    
    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      if (existingSoftware.customer && existingSoftware.customer.companyId !== session.companyId) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
      }
    }
    
    const software = await db.software.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type || 'SOFTWARE',
        version: data.version || null,
        manufacturer: data.manufacturer || null,
        description: data.description || null,
        licenseKey: data.licenseKey || null,
        licenseType: data.licenseType || null,
        seats: data.seats ? parseInt(data.seats) : null,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
        recurringPrice: data.recurringPrice ? parseFloat(data.recurringPrice) : null,
        billingCycle: data.billingCycle || null,
        currency: data.currency || 'EUR',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenew: data.autoRenew ?? false,
        customerId: data.customerId || null,
        contactId: data.contactId || null,
        computerId: data.computerId || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerNumber: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        computer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId,
        action: 'UPDATE',
        entity: 'Software',
        entityId: software.id,
        details: `Software ${software.name} aktualisiert`,
      },
    })
    
    return NextResponse.json({ software })
  } catch (error) {
    console.error('Error updating software:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
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
    
    const software = await db.software.findUnique({
      where: { id },
      include: { customer: { select: { companyId: true } } },
    })
    
    if (!software) {
      return NextResponse.json({ error: 'Software nicht gefunden' }, { status: 404 })
    }
    
    // Multi-tenant check
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      if (software.customer && software.customer.companyId !== session.companyId) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
      }
    }
    
    await db.software.delete({ where: { id } })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId,
        action: 'DELETE',
        entity: 'Software',
        entityId: id,
        details: `Software ${software.name} geloescht`,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting software:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
