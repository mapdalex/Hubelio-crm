import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ postId: string }> }

// POST /api/social/posts/[postId]/approve - Approve post
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

    // Only managers and admins can approve
    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { postId } = await params

    const post = await db.socialPost.findFirst({
      where: { id: postId, companyId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Can only approve posts in review
    if (post.status !== 'REVIEW') {
      return NextResponse.json(
        { error: 'Post ist nicht zur Pruefung eingereicht' },
        { status: 400 }
      )
    }

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'APPROVED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        approvedById: user.id,
        approvedAt: new Date(),
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error approving social post:', error)
    return NextResponse.json({ error: 'Fehler beim Freigeben' }, { status: 500 })
  }
}
