import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany, canManageProtectedContent } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

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

    const file = await db.file.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        },
        folder: {
          select: { id: true, name: true, isProtected: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(file)
  } catch (error) {
    console.error('Fehler beim Laden der Datei:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const file = await db.file.findUnique({
      where: { id },
      include: {
        folder: {
          select: { id: true, name: true, isProtected: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    // Files in protected folders can only be deleted by Admin/Manager
    if (file.folder?.isProtected && !canManageProtectedContent(session)) {
      return NextResponse.json(
        { error: 'Dateien in geschuetzten Ordnern koennen nur von Administratoren oder Managern geloescht werden' },
        { status: 403 }
      )
    }

    // Loesche physische Datei
    try {
      const filePath = path.join(process.cwd(), file.path)
      await unlink(filePath)
    } catch (err) {
      console.error('Fehler beim Loeschen der physischen Datei:', err)
    }

    // Loesche Datenbank-Eintrag
    await db.file.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Loeschen der Datei:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
