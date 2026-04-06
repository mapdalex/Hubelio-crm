import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    if (session!.role !== 'ADMIN' && session!.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Nur Admins' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, hourlyRate, isActive } = body

    const activity = await db.activity.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    if (session!.role !== 'ADMIN' && session!.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Nur Admins' }, { status: 403 })
    }

    const { id } = await params
    await db.activity.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
