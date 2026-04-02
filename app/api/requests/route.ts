import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isAdmin } from '@/lib/auth'

// GET: Liste aller Antraege
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
    const type = searchParams.get('type') || 'all'
    const view = searchParams.get('view') || 'own' // own = eigene, all = alle (fuer Manager/Admin)

    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Multi-tenant Filter
    if (session.companyId) {
      where.companyId = session.companyId
    }

    // View Filter: eigene oder alle (nur fuer Manager/Admin)
    if (view === 'own' || !isManager) {
      where.requesterId = session.userId
    }

    // Suchfilter
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { requester: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Status Filter
    if (status !== 'all') {
      where.status = status
    }

    // Typ Filter
    if (type !== 'all') {
      where.type = type
    }

    const [requests, total] = await Promise.all([
      db.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          calendarEvent: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
      db.request.count({ where }),
    ])

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Antraege' }, { status: 500 })
  }
}

// POST: Neuen Antrag erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const data = await request.json()
    const { type, title, description, startDate, endDate } = data

    if (!type || !title) {
      return NextResponse.json({ error: 'Typ und Titel sind erforderlich' }, { status: 400 })
    }

    // Antragsnummer generieren (ANT-XXXXXX)
    const lastRequest = await db.request.findFirst({
      orderBy: { requestNumber: 'desc' },
      where: {
        requestNumber: { startsWith: 'ANT' }
      }
    })

    let nextNumber = 1
    if (lastRequest) {
      const match = lastRequest.requestNumber.match(/\d+$/)
      if (match) {
        nextNumber = parseInt(match[0]) + 1
      }
    }

    const requestNumber = `ANT${nextNumber.toString().padStart(6, '0')}`

    const newRequest = await db.request.create({
      data: {
        requestNumber,
        companyId: session.companyId || null,
        requesterId: session.userId,
        type,
        status: 'PENDING',
        title,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Activity Log
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'CREATE',
        entity: 'Request',
        entityId: newRequest.id,
        details: `Antrag ${requestNumber} erstellt: ${title}`,
      },
    })

    return NextResponse.json({ request: newRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Antrags' }, { status: 500 })
  }
}
