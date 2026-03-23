import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const ticketId = searchParams.get('ticketId')
    const folderId = searchParams.get('folderId')

    const where: any = {}
    
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

    const files = await prisma.file.findMany({
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
    const user = await getCurrentUser()
    if (!user) {
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

    // Erstelle Datenbank-Eintrag
    const newFile = await prisma.file.create({
      data: {
        name: file.name,
        path: `/uploads/${fileName}`,
        size: file.size,
        mimeType: file.type,
        uploadedById: user.id,
        customerId: customerId || null,
        ticketId: ticketId || null,
        folderId: folderId || null
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
