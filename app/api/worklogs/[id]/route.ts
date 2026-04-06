import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const worklog = await db.worklog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, color: true } },
        activity: { select: { id: true, name: true } },
      },
    })

    if (!worklog) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung - Admin und Manager sehen alle, User nur eigene
    const canViewAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    if (!canViewAll && worklog.userId !== session!.userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    return NextResponse.json(worklog)
  } catch (error) {
    console.error('Error fetching worklog:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const worklog = await db.worklog.findUnique({ where: { id } })
    if (!worklog) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung - Admin und Manager duerfen alle bearbeiten
    const canEditAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    if (!canEditAll && worklog.userId !== session!.userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const body = await request.json()
    const { customerId, contactId, projectId, activityId, startTime, endTime, duration, description } = body

    const updated = await db.worklog.update({
      where: { id },
      data: {
        ...(customerId && { customerId }),
        // contactId kann null sein (um Kontakt zu entfernen)
        ...('contactId' in body && { contactId: contactId || null }),
        ...(projectId && { projectId }),
        ...(activityId && { activityId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(duration !== undefined && { duration }),
        ...(description !== undefined && { description }),
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating worklog:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const worklog = await db.worklog.findUnique({ where: { id } })
    if (!worklog) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Zugriffspruefung - Admin und Manager duerfen alle loeschen
    const canDeleteAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    if (!canDeleteAll && worklog.userId !== session!.userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    await db.worklog.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting worklog:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
