import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const settings = await db.settings.findMany()
    
    // Konvertiere zu Key-Value Objekt
    const settingsObj: Record<string, string> = {}
    settings.forEach(s => {
      settingsObj[s.key] = s.value
    })

    return NextResponse.json(settingsObj)
  } catch (error) {
    console.error('Fehler beim Laden der Einstellungen:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()

    // Upsert alle Einstellungen
    for (const [key, value] of Object.entries(body)) {
      await db.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Speichern der Einstellungen:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
