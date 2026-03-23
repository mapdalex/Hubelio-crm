import { NextResponse } from 'next/server'
import { deleteSession, getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const session = await getSession()
    
    if (session) {
      // Aktivitätslog
      await db.activityLog.create({
        data: {
          userId: session.userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: session.userId,
        },
      }).catch(() => {})
    }
    
    await deleteSession()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}
