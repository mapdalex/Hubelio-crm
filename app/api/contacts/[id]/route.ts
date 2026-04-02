import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

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
    
    const existingContact = await db.contact.findUnique({ where: { id } })
    if (!existingContact) {
      return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
    }
    
    // Wenn neuer Kontakt primaer ist, andere zuruecksetzen
    if (data.isPrimary) {
      await db.contact.updateMany({
        where: { customerId: existingContact.customerId, id: { not: id } },
        data: { isPrimary: false },
      })
    }
    
    const contact = await db.contact.update({
      where: { id },
      data: {
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
    
    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error updating contact:', error)
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
    
    const contact = await db.contact.findUnique({ where: { id } })
    if (!contact) {
      return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
    }
    
    await db.contact.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
