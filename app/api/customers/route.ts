import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

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
    const sortBy = searchParams.get('sortBy') || 'customerNumber'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const isActiveParam = searchParams.get('isActive')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Multi-tenant filter: Nur Kunden der eigenen Firma anzeigen
    // SUPERADMIN kann alle sehen, andere nur ihre Firma
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    }
    
    // Status filter
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { customerNumber: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              contacts: true,
              computers: true,
              tickets: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ])
    
    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Kundennummer generieren
    const settings = await db.systemSettings.findUnique({ where: { id: 'system' } })
    const prefix = settings?.customerPrefix || 'KD'
    const lastCustomer = await db.customer.findFirst({
      orderBy: { customerNumber: 'desc' },
    })
    
    let nextNumber = 1
    if (lastCustomer) {
      const match = lastCustomer.customerNumber.match(/\d+$/)
      if (match) {
        nextNumber = parseInt(match[0]) + 1
      }
    }
    
    const customerNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`
    
    const customerData = {
      customerNumber,
      companyId: session.companyId || null, // Multi-tenant: Kunde gehoert zur Firma des Erstellers
      companyName: data.company || data.companyName || null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      mobile: data.mobile || null,
      street: data.street || null,
      zipCode: data.zipCode || null,
      city: data.city || null,
      country: data.country || 'Deutschland',
      notes: data.notes || null,
    }
    
    const customer = await db.customer.create({
      data: customerData,
    })
    
    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Customer',
        entityId: customer.id,
        details: `Kunde ${customerNumber} erstellt`,
      },
    })
    
    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
