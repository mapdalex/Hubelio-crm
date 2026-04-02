import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const priority = searchParams.get('priority') || 'all'
    
    const isEmployee = canViewInCompany(session)
    
    const where: any = {}
    
    // Multi-tenant filter: Nur Tickets der eigenen Firma anzeigen
    // SUPERADMIN kann alle sehen (wenn keine Firma ausgewählt), andere nur ihre Firma
    if (isEmployee) {
      if (session.role !== 'SUPERADMIN' && session.companyId) {
        where.companyId = session.companyId
      } else if (session.role === 'SUPERADMIN' && session.companyId) {
        // SUPERADMIN mit ausgewählter Firma - zeige nur Tickets dieser Firma
        where.companyId = session.companyId
      }
      // SUPERADMIN ohne Firma sieht alle Tickets (kein Filter)
    } else {
      // Kunden sehen nur ihre eigenen Tickets
      const customer = await db.customer.findFirst({
        where: { userId: session.userId },
      })
      if (customer) {
        where.customerId = customer.id
      } else {
        return NextResponse.json({ tickets: [], pagination: { page: 1, total: 0, totalPages: 0 } })
      }
    }
    
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    if (status !== 'all') {
      where.status = status
    }
    
    if (priority !== 'all') {
      where.priority = priority
    }
    
    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              customerNumber: true,
              company: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          computer: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      db.ticket.count({ where }),
    ])
    
    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Ticketnummer generieren
    const settings = await db.systemSettings.findUnique({ where: { id: 'system' } })
    const prefix = settings?.ticketPrefix || 'TKT'
    const lastTicket = await db.ticket.findFirst({
      orderBy: { ticketNumber: 'desc' },
    })
    
    let nextNumber = 1
    if (lastTicket) {
      const match = lastTicket.ticketNumber.match(/\d+$/)
      if (match) {
        nextNumber = parseInt(match[0]) + 1
      }
    }
    
    const ticketNumber = `${prefix}${nextNumber.toString().padStart(6, '0')}`
    
    const isEmployee = canEditInCompany(session)
    
    // Wenn Kunde, dann customerId aus User holen
    let customerId = data.customerId
    if (!isEmployee) {
      const customer = await db.customer.findFirst({
        where: { userId: session.userId },
      })
      customerId = customer?.id
    }
    
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        subject: data.subject,
        description: data.description,
        status: 'OPEN',
        priority: data.priority || 'MEDIUM',
        companyId: session.companyId || null, // Multi-tenant: Ticket gehört zur Firma des Erstellers
        customerId: customerId || null,
        computerId: data.computerId || null,
        createdById: session.userId,
        assignedToId: data.assignedToId || null,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Ticket',
        entityId: ticket.id,
        details: `Ticket ${ticketNumber} erstellt`,
      },
    })
    
    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
