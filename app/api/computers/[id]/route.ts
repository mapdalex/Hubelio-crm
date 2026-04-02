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
    
    // Multi-tenant: Computer über Customer->companyId filtern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    }
    
    const computer = await db.computer.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, customerNumber: true, companyName: true, firstName: true, lastName: true, companyId: true }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
    
    if (!computer) {
      return NextResponse.json({ error: 'Geraet nicht gefunden' }, { status: 404 })
    }
    
    return NextResponse.json({ computer })
  } catch (error) {
    console.error('Error fetching computer:', error)
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
    
    // Multi-tenant: Pruefen ob Computer zur eigenen Firma gehoert (über Customer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    }
    
    const existingComputer = await db.computer.findFirst({ where: whereClause })
    if (!existingComputer) {
      return NextResponse.json({ error: 'Geraet nicht gefunden' }, { status: 404 })
    }
    
    const computer = await db.computer.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        operatingSystem: data.operatingSystem || null,
        processor: data.processor || null,
        ram: data.ram || null,
        storage: data.storage || null,
        ipAddress: data.ipAddress || null,
        macAddress: data.macAddress || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    })
    
    return NextResponse.json({ computer })
  } catch (error) {
    console.error('Error updating computer:', error)
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
    
    // Multi-tenant: Pruefen ob Computer zur eigenen Firma gehoert (über Customer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.customer = { companyId: session.companyId }
    }
    
    const computer = await db.computer.findFirst({ where: whereClause })
    if (!computer) {
      return NextResponse.json({ error: 'Geraet nicht gefunden' }, { status: 404 })
    }
    
    await db.computer.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting computer:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
