import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }
    
    const results: Array<{
      id: string
      type: 'customer' | 'contact' | 'ticket' | 'domain'
      title: string
      subtitle?: string
      url: string
    }> = []
    
    // Nur Mitarbeiter dürfen alles durchsuchen
    const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'].includes(session.role)
    
    if (isEmployee) {
      // Kunden suchen
      const customers = await db.customer.findMany({
        where: {
          OR: [
            { customerNumber: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { street: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      })
      
      customers.forEach((customer) => {
        results.push({
          id: customer.id,
          type: 'customer',
          title: customer.company || `${customer.firstName} ${customer.lastName}`,
          subtitle: `${customer.customerNumber} - ${customer.city || ''}`,
          url: `/customers/${customer.id}`,
        })
      })
      
      // Kontakte suchen
      const contacts = await db.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { customer: true },
        take: 5,
      })
      
      contacts.forEach((contact) => {
        results.push({
          id: contact.id,
          type: 'contact',
          title: `${contact.firstName} ${contact.lastName}`,
          subtitle: contact.customer.company || `${contact.customer.firstName} ${contact.customer.lastName}`,
          url: `/customers/${contact.customerId}?tab=contacts`,
        })
      })
      
      // Domains suchen
      const domains = await db.domain.findMany({
        where: {
          domainName: { contains: query, mode: 'insensitive' },
        },
        include: { customer: true },
        take: 5,
      })
      
      domains.forEach((domain) => {
        results.push({
          id: domain.id,
          type: 'domain',
          title: domain.domainName,
          subtitle: domain.customer.company || `${domain.customer.firstName} ${domain.customer.lastName}`,
          url: `/sales/domains/${domain.id}`,
        })
      })
    }
    
    // Tickets suchen (Kunden sehen nur eigene)
    const ticketWhere = session.role === 'KUNDE'
      ? {
          AND: [
            {
              OR: [
                { ticketNumber: { contains: query, mode: 'insensitive' as const } },
                { subject: { contains: query, mode: 'insensitive' as const } },
              ],
            },
            { customer: { userId: session.userId } },
          ],
        }
      : {
          OR: [
            { ticketNumber: { contains: query, mode: 'insensitive' as const } },
            { subject: { contains: query, mode: 'insensitive' as const } },
          ],
        }
    
    const tickets = await db.ticket.findMany({
      where: ticketWhere,
      include: { customer: true },
      take: 5,
    })
    
    tickets.forEach((ticket) => {
      results.push({
        id: ticket.id,
        type: 'ticket',
        title: `${ticket.ticketNumber}: ${ticket.subject}`,
        subtitle: ticket.customer?.company || ticket.customer?.firstName || 'Kein Kunde',
        url: `/tickets/${ticket.id}`,
      })
    })
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Suchfehler' }, { status: 500 })
  }
}
