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
    
    // Wenn neuer Kontakt primaer ist, andere zuruecksetzen
    if (data.isPrimary) {
      await db.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      })
    }
    
    const contact = await db.contact.create({
      data: {
        customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position || null,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        isPrimary: data.isPrimary || false,
        notes: data.notes || null,
      },
    })
    
    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
