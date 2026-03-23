import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const folders = await prisma.folder.findMany({
      where: {
        parentId: parentId || null
      },
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Fehler beim Laden der Ordner:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null
      }
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Ordners:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
