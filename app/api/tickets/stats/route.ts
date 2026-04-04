import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG', 'SUPERADMIN'].includes(session.role)
    
    // Build where clause based on role
    const where = isEmployee ? {} : {
      OR: [
        { createdById: session.userId },
        { customer: { userId: session.userId } },
      ],
    }

    const [total, open, urgent, inProgress] = await Promise.all([
      db.ticket.count({ where }),
      db.ticket.count({ where: { ...where, status: 'OPEN' } }),
      db.ticket.count({ 
        where: { 
          ...where, 
          priority: 'URGENT',
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        } 
      }),
      db.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    ])

    return NextResponse.json({
      total,
      open,
      urgent,
      inProgress,
    })
  } catch (error) {
    console.error('Error fetching ticket stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
