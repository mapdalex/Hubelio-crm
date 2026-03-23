import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const file = await db.file.findUnique({
      where: { id }
    })

    if (!file) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    // Lösche physische Datei
    try {
      const filePath = path.join(process.cwd(), file.path)
      await unlink(filePath)
    } catch (err) {
      console.error('Fehler beim Löschen der physischen Datei:', err)
    }

    // Lösche Datenbank-Eintrag
    await db.file.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Datei:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
