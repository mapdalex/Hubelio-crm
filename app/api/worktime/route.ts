import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get user with company info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { companyUser: { include: { company: true } } },
    })

    if (!user?.companyUser?.[0]?.company) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    const userCompanyId = user.companyUser[0].company.id
    const companyRole = user.companyUser[0].role // CompanyRole: MEMBER, MANAGER, ADMIN, OWNER

    // Build where clause based on permissions
    let where: any = { companyId: userCompanyId }

    // If not admin, manager, or owner - only show own records
    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(companyRole)) {
      where.userId = session.user.id
    } else if (userId) {
      // Admin/Manager can filter by specific user
      where.userId = userId
    }

    // Apply additional filters
    if (type) {
      where.type = type
    }

    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) {
        where.startTime.gte = new Date(startDate)
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate)
      }
    }

    const workTimes = await prisma.workTime.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json(workTimes)
  } catch (error) {
    console.error('[WorkTime GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await req.json()

    if (!['WORK', 'HOME_OFFICE', 'DOCTOR_VISIT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Get user company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { companyUser: true },
    })

    if (!user?.companyUser?.[0]) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    // Check if user already has active work time
    const activeWorkTime = await prisma.workTime.findFirst({
      where: {
        userId: session.user.id,
        endTime: null,
      },
    })

    if (activeWorkTime) {
      return NextResponse.json(
        { error: 'You already have an active work time entry' },
        { status: 400 }
      )
    }

    const workTime = await prisma.workTime.create({
      data: {
        type,
        startTime: new Date(),
        userId: session.user.id,
        companyId: user.companyUser[0].companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(workTime)
  } catch (error) {
    console.error('[WorkTime POST]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
