import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Multi-tenant: Ticket-Abfrage mit Company-Filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (isEmployee(session.role)) {
      if (session.role !== 'SUPERADMIN' && session.companyId) {
        whereClause.companyId = session.companyId
      } else if (session.role === 'SUPERADMIN' && session.companyId) {
        whereClause.companyId = session.companyId
      }
    }
    
    const ticket = await db.ticket.findFirst({
      where: whereClause,
      include: {
        customer: true,
        computer: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        attachments: true,
      },
    })
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
    }
    
    // Pruefen ob Benutzer Zugriff hat
    if (!isEmployee(session.role)) {
      const customer = await db.customer.findFirst({
        where: { userId: session.userId },
      })
      if (!customer || ticket.customerId !== customer.id) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
      }
      // Interne Kommentare fuer Kunden ausblenden
      ticket.comments = ticket.comments.filter(c => !c.isInternal)
    }
    
    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error fetching ticket:', error)
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
    
    // Multi-tenant: Pruefen ob Ticket zur eigenen Firma gehoert
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      const existingTicket = await db.ticket.findFirst({
        where: { id, companyId: session.companyId }
      })
      if (!existingTicket) {
        return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
      }
    }
    
    const ticket = await db.ticket.update({
      where: { id },
      data: {
        status: data.status,
        priority: data.priority,
        assignedToId: data.assignedToId,
        closedAt: data.status === 'CLOSED' ? new Date() : null,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entity: 'Ticket',
        entityId: ticket.id,
        details: `Ticket ${ticket.ticketNumber} aktualisiert`,
      },
    })
    
    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error updating ticket:', error)
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
    
    // Multi-tenant: Pruefen ob Ticket zur eigenen Firma gehoert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { id }
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      whereClause.companyId = session.companyId
    }
    
    const ticket = await db.ticket.findFirst({ where: whereClause })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
    }
    
    await db.ticket.delete({ where: { id } })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'DELETE',
        entity: 'Ticket',
        entityId: id,
        details: `Ticket ${ticket.ticketNumber} geloescht`,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
