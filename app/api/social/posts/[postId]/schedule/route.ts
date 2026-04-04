import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ postId: string }> }

// POST /api/social/posts/[postId]/schedule - Schedule post for publishing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    // Only managers and admins can schedule
    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { postId } = await params
    const data = await request.json()

    if (!data.scheduledFor) {
      return NextResponse.json({ error: 'Zeitpunkt erforderlich' }, { status: 400 })
    }

    const scheduledFor = new Date(data.scheduledFor)
    if (scheduledFor <= new Date()) {
      return NextResponse.json(
        { error: 'Zeitpunkt muss in der Zukunft liegen' },
        { status: 400 }
      )
    }

    const post = await db.socialPost.findFirst({
      where: { id: postId, companyId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Can only schedule approved posts
    if (post.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Post muss erst freigegeben werden' },
        { status: 400 }
      )
    }

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'SCHEDULED',
        scheduledFor,
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error scheduling social post:', error)
    return NextResponse.json({ error: 'Fehler beim Planen' }, { status: 500 })
  }
}
