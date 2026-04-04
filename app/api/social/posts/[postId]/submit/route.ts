import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ postId: string }> }

// POST /api/social/posts/[postId]/submit - Submit post for review
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

    const { postId } = await params

    const post = await db.socialPost.findFirst({
      where: { id: postId, companyId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only creator can submit
    if (post.createdById !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Can only submit drafts or rejected posts
    if (!['DRAFT', 'REJECTED'].includes(post.status)) {
      return NextResponse.json(
        { error: 'Post kann nicht eingereicht werden' },
        { status: 400 }
      )
    }

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'REVIEW',
        rejectionReason: null,
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error submitting social post:', error)
    return NextResponse.json({ error: 'Fehler beim Einreichen' }, { status: 500 })
  }
}
