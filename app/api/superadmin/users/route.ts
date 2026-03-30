import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isSuperAdmin } from '@/lib/auth'

// GET /api/superadmin/users - Get all users system-wide (Superadmin only)
export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        companyUsers: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    })
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    )
  }
}
