import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isEmployee } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const ticketId = searchParams.get('ticketId')
    const folderId = searchParams.get('folderId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Multi-tenant filter: Files über companyId filtern
    if (isEmployee(session.role)) {
      if (session.role !== 'SUPERADMIN' && session.companyId) {
        where.companyId = session.companyId
      } else if (session.role === 'SUPERADMIN' && session.companyId) {
        where.companyId = session.companyId
      }
    } else {
      // Kunden sehen nur ihre eigenen Files
      const customer = await db.customer.findFirst({
        where: { userId: session.userId }
      })
      if (customer) {
        where.customerId = customer.id
      } else {
        return NextResponse.json([])
      }
    }
    
    if (customerId) {
      where.customerId = customerId
    }
    if (ticketId) {
      where.ticketId = ticketId
    }
    if (folderId) {
      where.folderId = folderId
    } else if (!customerId && !ticketId) {
      where.folderId = null
    }

    const files = await db.file.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        },
        customer: {
          select: { id: true, name: true }
        },
        folder: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error('Fehler beim Laden der Dateien:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isEmployee(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const customerId = formData.get('customerId') as string | null
    const ticketId = formData.get('ticketId') as string | null
    const folderId = formData.get('folderId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Erstelle Upload-Verzeichnis
    const uploadDir = path.join(process.cwd(), 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Generiere eindeutigen Dateinamen
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = path.join(uploadDir, fileName)

    // Speichere Datei
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Erstelle Datenbank-Eintrag mit companyId für Multi-Tenant
    const newFile = await db.file.create({
      data: {
        filename: file.name,
        originalName: file.name,
        path: `/uploads/${fileName}`,
        size: file.size,
        mimeType: file.type,
        companyId: session.companyId || null, // Multi-tenant
        uploadedById: session.userId,
        customerId: customerId || null,
        ticketId: ticketId || null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(newFile, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Hochladen:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
