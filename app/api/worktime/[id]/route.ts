import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const workTime = await db.workTime.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (!workTime) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'
    const isOwner = workTime.userId === session.userId

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    return NextResponse.json(workTime)
  } catch (error) {
    console.error('Error fetching work time:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const workTime = await db.workTime.findUnique({
      where: { id },
    })

    if (!workTime) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    const isOwner = workTime.userId === session.userId
    if (!isOwner) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const updatedWorkTime = await db.workTime.update({
      where: { id },
      data: {
        endTime: data.endTime ? new Date(data.endTime) : null,
        notes: data.notes || null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (updatedWorkTime.endTime && updatedWorkTime.startTime) {
      const durationMs = updatedWorkTime.endTime.getTime() - updatedWorkTime.startTime.getTime()
      const durationMinutes = Math.floor(durationMs / 60000)

      await db.workTime.update({
        where: { id },
        data: { duration: durationMinutes },
      })
    }

    return NextResponse.json(updatedWorkTime)
  } catch (error) {
    console.error('Error updating work time:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const workTime = await db.workTime.findUnique({
      where: { id },
    })

    if (!workTime) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'
    const isOwner = workTime.userId === session.userId

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await db.workTime.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting work time:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
