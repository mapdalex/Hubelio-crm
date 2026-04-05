import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const activities = await db.activity.findMany({
      where: {
        companyId: session!.companyId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Admin only
    if (session!.role !== 'ADMIN' && session!.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Nur Admins koennen Taetigkeiten erstellen' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, hourlyRate } = body

    if (!name) {
      return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })
    }

    const activity = await db.activity.create({
      data: {
        name,
        description,
        hourlyRate: hourlyRate || 0,
        companyId: session!.companyId,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
