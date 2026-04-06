import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/todos/[id]/complete
 * Todo als erledigt markieren
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const todo = await db.todo.findUnique({ where: { id } })
    if (!todo) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung
    const canEditAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    const isOwner = todo.userId === session!.userId || todo.createdById === session!.userId
    if (!canEditAll && !isOwner) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const updated = await db.todo.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error completing todo:', error)
    return NextResponse.json({ error: 'Fehler beim Abschliessen' }, { status: 500 })
  }
}

/**
 * DELETE /api/todos/[id]/complete
 * Todo als nicht erledigt markieren (Status zuruecksetzen)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const todo = await db.todo.findUnique({ where: { id } })
    if (!todo) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung
    const canEditAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    const isOwner = todo.userId === session!.userId || todo.createdById === session!.userId
    if (!canEditAll && !isOwner) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const updated = await db.todo.update({
      where: { id },
      data: {
        isCompleted: false,
        completedAt: null,
      },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error uncompleting todo:', error)
    return NextResponse.json({ error: 'Fehler beim Zuruecksetzen' }, { status: 500 })
  }
}
