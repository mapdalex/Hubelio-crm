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
    const filter = searchParams.get('filter') || 'all' // all, renewal, active
    
    const where: any = {}
    
    // Multi-tenant filter: Services über Customer->companyId filtern
    // SUPERADMIN kann alle sehen, andere nur ihre Firma
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.customer = { companyId: session.companyId }
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      // SUPERADMIN mit ausgewählter Firma - zeige nur Services dieser Firma
      where.customer = { companyId: session.companyId }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (filter === 'renewal') {
      where.renewalDate = {
        gte: now,
        lte: thirtyDaysFromNow,
      }
      where.status = 'active'
    } else if (filter === 'active') {
      where.status = 'active'
    }
    
    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { renewalDate: 'asc' },
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
        },
      }),
      db.service.count({ where }),
    ])
    
    return NextResponse.json({
      services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching services:', error)
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
    
    const service = await db.service.create({
      data: {
        customerId: data.customerId,
        name: data.name,
        description: data.description || null,
        type: data.type || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        billingCycle: data.billingCycle || 'monthly',
        costPrice: data.costPrice || null,
        sellPrice: data.sellPrice || null,
        status: data.status || 'active',
        notes: data.notes || null,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Service',
        entityId: service.id,
        details: `Service ${service.name} erstellt`,
      },
    })
    
    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
