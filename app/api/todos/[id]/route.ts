import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * GET /api/todos/[id]
 * Einzelnes Todo abrufen
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const todo = await db.todo.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!todo) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung
    const canViewAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    const isOwner = todo.userId === session!.userId || todo.createdById === session!.userId
    if (!canViewAll && !isOwner) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error fetching todo:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

/**
 * PATCH /api/todos/[id]
 * Todo bearbeiten (Titel, Beschreibung, Faelligkeit, Status)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Zugriffspruefung - Admin/Manager duerfen alle bearbeiten
    const canEditAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    const isOwner = todo.userId === session!.userId || todo.createdById === session!.userId
    if (!canEditAll && !isOwner) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, dueDate, priority, isCompleted } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (priority !== undefined) updateData.priority = priority
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      updateData.completedAt = isCompleted ? new Date() : null
    }

    const updated = await db.todo.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

/**
 * DELETE /api/todos/[id]
 * Todo loeschen
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

    // Zugriffspruefung - Admin/Manager duerfen alle loeschen
    const canDeleteAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    const isOwner = todo.userId === session!.userId || todo.createdById === session!.userId
    if (!canDeleteAll && !isOwner) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.todo.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
