import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const activeWorkTime = await db.workTime.findFirst({
      where: {
        userId: session.userId,
        endTime: null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(activeWorkTime || null)
  } catch (error) {
    console.error('Error fetching active work time:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}
