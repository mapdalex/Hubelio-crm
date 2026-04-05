import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { companyUser: { include: { company: true } } },
    })

    if (!user?.companyUser[0]) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    const userCompanyId = user.companyUser[0].company.id
    const companyRole = user.companyUser[0].role

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    let where: any = { companyId: userCompanyId }

    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(companyRole)) {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }

    if (type) {
      where.type = type
    }

    const workTimes = await prisma.workTime.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { startTime: 'desc' },
    })

    return NextResponse.json(workTimes)
  } catch (error) {
    console.error('Error fetching work times:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type } = body

    if (!['WORK', 'HOME_OFFICE', 'DOCTOR_VISIT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { companyUser: { include: { company: true } } },
    })

    if (!user?.companyUser[0]) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Check if already has active work time
    const activeWorkTime = await prisma.workTime.findFirst({
      where: {
        userId: session.user.id,
        endTime: null,
      },
    })

    if (activeWorkTime) {
      return NextResponse.json(
        { error: 'Already have active work time' },
        { status: 400 }
      )
    }

    const workTime = await prisma.workTime.create({
      data: {
        userId: session.user.id,
        companyId: user.companyUser[0].company.id,
        type,
        startTime: new Date(),
      },
      include: { user: { select: { name: true, email: true } } },
    })

    return NextResponse.json(workTime)
  } catch (error) {
    console.error('Error creating work time:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
