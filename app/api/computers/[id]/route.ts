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
    
    const computer = await db.computer.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, customerNumber: true, company: true, firstName: true, lastName: true }
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
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    const data = await request.json()
    
    const existingComputer = await db.computer.findUnique({ where: { id } })
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
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    
    const computer = await db.computer.findUnique({ where: { id } })
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
