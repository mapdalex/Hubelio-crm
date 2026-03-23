import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    
    const where: any = {}
    
    if (role === 'employee') {
      where.role = { in: ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG'] }
    }
    
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Email pruefen
    const existing = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'E-Mail Adresse bereits vergeben' },
        { status: 400 }
      )
    }
    
    const hashedPassword = await hashPassword(data.password)
    
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        role: data.role || 'GAST',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
    
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        details: `Benutzer ${user.email} erstellt`,
      },
    })
    
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
