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
    const filter = searchParams.get('filter') || 'all' // all, active, inactive, warranty
    const type = searchParams.get('type') || '' // Desktop, Laptop, Server, etc.
    
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (filter === 'active') {
      where.isActive = true
    } else if (filter === 'inactive') {
      where.isActive = false
    } else if (filter === 'warranty') {
      where.warrantyUntil = {
        gte: now,
        lte: thirtyDaysFromNow,
      }
      where.isActive = true
    }
    
    if (type) {
      where.type = type
    }
    
    const [computers, total] = await Promise.all([
      db.computer.findMany({
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
        },
      }),
      db.computer.count({ where }),
    ])
    
    return NextResponse.json({
      computers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching computers:', error)
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
    
    const computer = await db.computer.create({
      data: {
        customerId: data.customerId,
        name: data.name,
        type: data.type || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        operatingSystem: data.operatingSystem || null,
        processor: data.processor || null,
        ram: data.ram || null,
        storage: data.storage || null,
        ipAddress: data.ipAddress || null,
        macAddress: data.macAddress || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Computer',
        entityId: computer.id,
        details: `Geraet ${computer.name} erstellt`,
      },
    })
    
    return NextResponse.json({ computer }, { status: 201 })
  } catch (error) {
    console.error('Error creating computer:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
