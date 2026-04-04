import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ postId: string }> }

// GET /api/social/posts/[postId]
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        targetAccounts: {
          include: {
            account: { select: { id: true, platform: true, accountName: true, profileImage: true } },
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching social post:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Posts' }, { status: 500 })
  }
}

// PATCH /api/social/posts/[postId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Only creator or admin can edit
    if (post.createdById !== user.id && !['ADMIN', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Can only edit drafts or rejected posts
    if (!['DRAFT', 'REJECTED'].includes(post.status)) {
      return NextResponse.json(
        { error: 'Post kann nicht mehr bearbeitet werden' },
        { status: 400 }
      )
    }

    const data = await request.json()

    const updated = await db.socialPost.update({
      where: { id: postId },
      data: {
        content: data.content,
        postType: data.postType,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        status: 'DRAFT', // Reset to draft if rejected
        rejectionReason: null,
      },
      include: {
        media: true,
        targetAccounts: {
          include: {
            account: { select: { id: true, platform: true, accountName: true } },
          },
        },
      },
    })

    return NextResponse.json({ post: updated })
  } catch (error) {
    console.error('Error updating social post:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/social/posts/[postId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Only creator or admin can delete
    if (post.createdById !== user.id && !['ADMIN', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Can't delete published posts
    if (post.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Veroeffentlichte Posts koennen nicht geloescht werden' },
        { status: 400 }
      )
    }

    await db.socialPost.delete({
      where: { id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting social post:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
