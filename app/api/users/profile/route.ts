import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { name, theme } = data

    const user = await db.user.update({
      where: { id: session.userId },
      data: {
        name: name || undefined,
        theme: theme || undefined,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[v0] Error updating profile:', error)
    return NextResponse.json({ error: 'Error updating profile' }, { status: 500 })
  }
}
