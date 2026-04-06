import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

/**
 * GET /api/worklogs
 * Worklogs abrufen - mit Rollenbasiertem Zugriff
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const projectId = searchParams.get('projectId')
    const month = searchParams.get('month') // YYYY-MM format
    const userId = searchParams.get('userId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {}

    // Multi-tenant filter
    if (session!.role !== 'SUPERADMIN' && session!.companyId) {
      filter.companyId = session!.companyId
    }

    if (customerId) filter.customerId = customerId
    if (projectId) filter.projectId = projectId
    if (userId) filter.userId = userId

    // Month filtering (YYYY-MM format)
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)
      filter.startTime = { gte: startDate, lte: endDate }
    }

    // Rollenbasierter Zugriff: Admin und Manager sehen alle, User nur eigene
    const canViewAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    if (!canViewAll) {
      filter.userId = session!.userId
    }

    const worklogs = await db.worklog.findMany({
      where: filter,
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, color: true } },
        activity: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json(worklogs)
  } catch (error) {
    console.error('Error fetching worklogs:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

/**
 * POST /api/worklogs
 * Neuen Worklog erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerId,
      contactId,
      projectId,
      activityId,
      startTime,
      endTime,
      duration,
      description,
    } = body

    // Validation
    if (!customerId || !projectId || !activityId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Bitte alle Pflichtfelder ausfuellen' },
        { status: 400 }
      )
    }

    const worklog = await db.worklog.create({
      data: {
        userId: session!.userId,
        customerId,
        contactId: contactId || null,
        projectId,
        activityId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: duration || Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
        description,
        companyId: session!.companyId,
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(worklog, { status: 201 })
  } catch (error) {
    console.error('Error creating worklog:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
