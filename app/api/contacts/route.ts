import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'lastName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Multi-tenant filter: Nur Kontakte von Kunden der eigenen Firma anzeigen
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.customer = {
        companyId: session.companyId
      }
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    // Handle sorting - need to handle nested customer sort
    let orderBy: Record<string, unknown> = {}
    if (sortBy === 'customerName') {
      orderBy = { customer: { lastName: sortOrder } }
    } else {
      orderBy = { [sortBy]: sortOrder }
    }
    
    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
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
        },
      }),
      db.contact.count({ where }),
    ])
    
    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}
