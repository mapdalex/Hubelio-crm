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
    const filter = searchParams.get('filter') || 'all' // all, active, inactive, expiring
    const type = searchParams.get('type') || '' // SOFTWARE, LICENSE, CLOUD_SERVICE, etc.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Multi-tenant filter: Software über Customer->companyId filtern
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.OR = [
        { customer: { companyId: session.companyId } },
        { customerId: null } // Software ohne Kundenzuweisung (Firmeneigene)
      ]
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      where.OR = [
        { customer: { companyId: session.companyId } },
        { customerId: null }
      ]
    }
    
    if (search) {
      const searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
          { licenseKey: { contains: search, mode: 'insensitive' } },
          { customer: { companyName: { contains: search, mode: 'insensitive' } } },
          { contact: { lastName: { contains: search, mode: 'insensitive' } } },
          { computer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
      
      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchCondition]
        delete where.OR
      } else {
        Object.assign(where, searchCondition)
      }
    }
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (filter === 'active') {
      where.isActive = true
    } else if (filter === 'inactive') {
      where.isActive = false
    } else if (filter === 'expiring') {
      where.expiryDate = {
        gte: now,
        lte: thirtyDaysFromNow,
      }
      where.isActive = true
    }
    
    if (type) {
      where.type = type
    }
    
    const [software, total] = await Promise.all([
      db.software.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          computer: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      db.software.count({ where }),
    ])
    
    return NextResponse.json({
      software,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching software:', error)
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
    
    const software = await db.software.create({
      data: {
        name: data.name,
        type: data.type || 'SOFTWARE',
        version: data.version || null,
        manufacturer: data.manufacturer || null,
        description: data.description || null,
        licenseKey: data.licenseKey || null,
        licenseType: data.licenseType || null,
        seats: data.seats ? parseInt(data.seats) : null,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
        recurringPrice: data.recurringPrice ? parseFloat(data.recurringPrice) : null,
        billingCycle: data.billingCycle || null,
        currency: data.currency || 'EUR',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        autoRenew: data.autoRenew ?? false,
        customerId: data.customerId || null,
        contactId: data.contactId || null,
        computerId: data.computerId || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
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
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        computer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId,
        action: 'CREATE',
        entity: 'Software',
        entityId: software.id,
        details: `Software ${software.name} erstellt`,
      },
    })
    
    return NextResponse.json({ software }, { status: 201 })
  } catch (error) {
    console.error('Error creating software:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
