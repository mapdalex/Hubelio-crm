import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany, canManageProtectedContent } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      parentId: parentId || null
    }

    // Multi-tenant: Filter by company
    if (session.role !== 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    } else if (session.role === 'SUPERADMIN' && session.companyId) {
      where.companyId = session.companyId
    }

    // For correct file count, we need to filter files by companyId as well
    const companyFilter = session.companyId ? { companyId: session.companyId } : {}
    
    const folders = await db.folder.findMany({
      where,
      include: {
        _count: {
          select: {
            files: {
              where: companyFilter
            },
            children: {
              where: companyFilter
            }
          }
        },
        createdBy: {
          select: { id: true, name: true }
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
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId, isProtected } = body

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    // Only Admin/Manager can create protected folders
    const folderIsProtected = isProtected && canManageProtectedContent(session)

    const folder = await db.folder.create({
      data: {
        name,
        parentId: parentId || null,
        isProtected: folderIsProtected,
        companyId: session!.companyId || null,
        createdById: session!.userId
      },
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

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Ordners:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
