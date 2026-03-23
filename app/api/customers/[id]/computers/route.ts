import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id: customerId } = await params
    const data = await request.json()
    
    // Pruefen ob Kunde existiert
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }
    
    const computer = await db.computer.create({
      data: {
        customerId,
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
      },
    })
    
    return NextResponse.json({ computer }, { status: 201 })
  } catch (error) {
    console.error('Error creating computer:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
