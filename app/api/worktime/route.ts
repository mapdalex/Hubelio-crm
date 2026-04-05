import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (session.companyId) {
      where.companyId = session.companyId
    }

    if (!isManager) {
      where.userId = session.userId
    } else if (userId) {
      where.userId = userId
    }

    if (type) {
      where.type = type
    }

    const workTimes = await db.workTime.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json(workTimes)
  } catch (error) {
    console.error('Error fetching work times:', error)
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
    const { type } = data

    if (!['WORK', 'HOME_OFFICE', 'DOCTOR_VISIT'].includes(type)) {
      return NextResponse.json({ error: 'Ungueltiger Typ' }, { status: 400 })
    }

    const activeWorkTime = await db.workTime.findFirst({
      where: {
        userId: session.userId,
        endTime: null,
      },
    })

    if (activeWorkTime) {
      return NextResponse.json({ error: 'Bereits aktive Arbeitszeit' }, { status: 400 })
    }

    const workTime = await db.workTime.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        type,
        startTime: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(workTime, { status: 201 })
  } catch (error) {
    console.error('Error creating work time:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
