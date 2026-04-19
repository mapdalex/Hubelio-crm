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

    const folder = await db.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        parent: {
          select: { id: true, name: true }
        }
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Fehler beim Laden des Ordners:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, isProtected } = body

    const folder = await db.folder.findUnique({
      where: { id }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 })
    }

    // Only Admin/Manager can change protection status
    const updateData: { name?: string; isProtected?: boolean } = {}
    
    if (name) {
      updateData.name = name
    }
    
    if (typeof isProtected === 'boolean' && canManageProtectedContent(session)) {
      updateData.isProtected = isProtected
    }

    const updatedFolder = await db.folder.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(updatedFolder)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Ordners:', error)
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

    const folder = await db.folder.findUnique({
      where: { id },
      include: {
        files: true,
        children: {
          include: {
            files: true
          }
        }
      }
    })

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden' }, { status: 404 })
    }

    // Protected folders can only be deleted by Admin/Manager
    if (folder.isProtected && !canManageProtectedContent(session)) {
      return NextResponse.json(
        { error: 'Geschuetzte Ordner koennen nur von Administratoren oder Managern geloescht werden' },
        { status: 403 }
      )
    }

    // Check if user is allowed to delete (only creator or Admin/Manager)
    const isCreator = folder.createdById === session!.userId
    const canManage = canManageProtectedContent(session)
    
    if (!isCreator && !canManage) {
      return NextResponse.json(
        { error: 'Sie koennen nur Ihre eigenen Ordner loeschen' },
        { status: 403 }
      )
    }

    // Delete all files in the folder and subfolders
    const deleteFiles = async (files: { id: string; path: string }[]) => {
      for (const file of files) {
        try {
          const filePath = path.join(process.cwd(), file.path)
          await unlink(filePath)
        } catch (err) {
          console.error('Fehler beim Loeschen der physischen Datei:', err)
        }
      }
    }

    // Delete files in this folder
    await deleteFiles(folder.files)

    // Delete files in child folders
    for (const child of folder.children) {
      await deleteFiles(child.files)
    }

    // Delete folder (cascade will delete children and files in DB)
    await db.folder.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Loeschen des Ordners:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
