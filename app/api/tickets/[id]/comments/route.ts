import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id: ticketId } = await params
    const data = await request.json()
    
    // Pruefen ob Ticket existiert
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
    }
    
    // Pruefen ob Benutzer Zugriff hat (entweder als Mitarbeiter oder als Kunde des Tickets)
    const isEmp = canEditInCompany(session)
    if (!isEmp) {
      const customer = await db.customer.findFirst({
        where: { userId: session.userId },
      })
      if (!customer || ticket.customerId !== customer.id) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
      }
    }
    
    const comment = await db.ticketComment.create({
      data: {
        ticketId,
        userId: session.userId,
        content: data.content,
        isInternal: isEmp ? (data.isInternal || false) : false,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    })
    
    // Ticket-Status auf "IN_PROGRESS" setzen wenn noch "OPEN"
    if (ticket.status === 'OPEN' && isEmp) {
      await db.ticket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      })
    }
    
    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
