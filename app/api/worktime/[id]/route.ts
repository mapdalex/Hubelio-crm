import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workTime = await prisma.workTime.findUnique({
      where: { id: params.id },
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

    if (!workTime) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { companyUser: true },
    })

    const userCompanyId = user?.companyUser?.[0]?.companyId
    const isOwner = workTime.userId === session.user.id
    const isAdminOrManager = ['ADMIN', 'MANAGER', 'OWNER'].includes(user?.role || '')
    const isSameCompany = workTime.companyId === userCompanyId

    if (!isOwner && (!isAdminOrManager || !isSameCompany)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(workTime)
  } catch (error) {
    console.error('[WorkTime GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workTime = await prisma.workTime.findUnique({
      where: { id: params.id },
    })

    if (!workTime) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check permissions - only owner can end their own entry
    if (workTime.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate duration if ending
    const body = await req.json()
    let duration = workTime.duration

    if (body.endTime) {
      const start = new Date(workTime.startTime).getTime()
      const end = new Date(body.endTime).getTime()
      duration = Math.round((end - start) / (1000 * 60)) // Minutes
    }

    const updated = await prisma.workTime.update({
      where: { id: params.id },
      data: {
        endTime: body.endTime ? new Date(body.endTime) : workTime.endTime,
        duration,
        notes: body.notes ?? workTime.notes,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[WorkTime PATCH]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workTime = await prisma.workTime.findUnique({
      where: { id: params.id },
    })

    if (!workTime) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check permissions - owner or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    const isOwner = workTime.userId === session.user.id
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.workTime.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WorkTime DELETE]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
