import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ postId: string }> }

// POST /api/social/posts/[postId]/reject - Reject post
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

    // Only managers and admins can reject
    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { postId } = await params
    const data = await request.json()

    const post = await db.socialPost.findFirst({
      where: { id: postId, companyId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Can only reject posts in review
    if (post.status !== 'REVIEW') {
      return NextResponse.json(
        { error: 'Post ist nicht zur Pruefung eingereicht' },
        { status: 400 }
      )
    }

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'REJECTED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: data.reason || 'Keine Begruendung angegeben',
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error rejecting social post:', error)
    return NextResponse.json({ error: 'Fehler beim Ablehnen' }, { status: 500 })
  }
}
