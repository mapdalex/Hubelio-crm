import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; emailId: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = params.id
    const emailId = params.emailId

    // Verify user is admin
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId,
        role: 'ADMIN',
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.emailSettings.delete({
      where: { id: emailId },
    })

    return NextResponse.json({ message: 'Email settings deleted' })
  } catch (error) {
    console.error('[v0] Error deleting email settings:', error)
    return NextResponse.json({ error: 'Error deleting settings' }, { status: 500 })
  }
}
