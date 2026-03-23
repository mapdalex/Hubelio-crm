import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, expiring, expired
    
    const where: any = {}
    
    if (search) {
      where.OR = [
        { domainName: { contains: search, mode: 'insensitive' } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (filter === 'expiring') {
      where.expiryDate = {
        gte: now,
        lte: thirtyDaysFromNow,
      }
      where.status = 'active'
    } else if (filter === 'expired') {
      where.expiryDate = { lt: now }
      where.status = 'active'
    }
    
    const [domains, total] = await Promise.all([
      db.domain.findMany({
        where,
        orderBy: { expiryDate: 'asc' },
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
      db.domain.count({ where }),
    ])
    
    return NextResponse.json({
      domains,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const data = await request.json()
    
    const domain = await db.domain.create({
      data: {
        customerId: data.customerId,
        domainName: data.domainName,
        registrar: data.registrar || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenew: data.autoRenew ?? true,
        costPrice: data.costPrice || null,
        sellPrice: data.sellPrice || null,
        billingCycle: data.billingCycle || 'yearly',
        status: data.status || 'active',
        notes: data.notes || null,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Domain',
        entityId: domain.id,
        details: `Domain ${domain.domainName} erstellt`,
      },
    })
    
    return NextResponse.json({ domain }, { status: 201 })
  } catch (error) {
    console.error('Error creating domain:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
