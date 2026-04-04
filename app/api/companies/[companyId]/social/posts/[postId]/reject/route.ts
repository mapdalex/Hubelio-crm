import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/companies/[companyId]/social/posts/[postId]/reject
// Reject post (Manager/Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; postId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { companyId, postId } = await params

    // Check company access and role
    const companyUser = await prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    })

    if (!companyUser && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Firma' }, { status: 403 })
    }

    // Only Manager, Admin, Owner can reject
    if (companyUser && !['ADMIN', 'MANAGER', 'OWNER'].includes(companyUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung zur Ablehnung' }, { status: 403 })
    }

    // Get existing post
    const existingPost = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        companyId,
      },
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only allow rejecting if post is in REVIEW status
    if (existingPost.status !== 'REVIEW') {
      return NextResponse.json({ 
        error: 'Nur Posts in Pruefung koennen abgelehnt werden (Status: ' + existingPost.status + ')' 
      }, { status: 400 })
    }

    // Get rejection reason from request body
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Bitte einen Ablehnungsgrund angeben' }, { status: 400 })
    }

    // Update post
    const post = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'REJECTED',
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: reason.trim(),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
        targetAccounts: {
          include: {
            account: {
              select: { id: true, platform: true, accountName: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ 
      post,
      message: 'Post abgelehnt',
    })
  } catch (error) {
    console.error('Error rejecting post:', error)
    return NextResponse.json({ error: 'Fehler beim Ablehnen' }, { status: 500 })
  }
}
