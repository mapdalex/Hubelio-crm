import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeWorkTime = await prisma.workTime.findFirst({
      where: {
        userId: session.user.id,
        endTime: null,
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

    return NextResponse.json(activeWorkTime || null)
  } catch (error) {
    console.error('[WorkTime Active GET]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
