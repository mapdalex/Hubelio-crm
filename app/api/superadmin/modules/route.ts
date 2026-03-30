import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    // Nur Superadmin kann Module abrufen
    const session = await getSession()
    if (!session?.userId || session.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Nur Superadmin darf Module abrufen' },
        { status: 403 }
      )
    }

    // Alle Module abrufen, sortiert nach sortOrder
    const modules = await db.module.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(modules)
  } catch (error) {
    console.error('Error fetching modules:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Module' },
      { status: 500 }
    )
  }
}
