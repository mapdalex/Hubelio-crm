import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/companies/[id]/social/posts/[postId]/approve
// Approve post (Manager/Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id, postId } = await params

    // Check company access and role
    const companyUser = await prisma.companyUser.findUnique({
      where: {
        userId_id: {
          userId: user.id,
          id,
        },
      },
    })

    if (!companyUser && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Firma' }, { status: 403 })
    }

    // Only Manager, Admin, Owner can approve
    if (companyUser && !['ADMIN', 'MANAGER', 'OWNER'].includes(companyUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung zur Freigabe' }, { status: 403 })
    }

    // Get existing post
    const existingPost = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        id,
      },
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only allow approving if post is in REVIEW status
    if (existingPost.status !== 'REVIEW') {
      return NextResponse.json({ 
        error: 'Nur Posts in Pruefung koennen freigegeben werden (Status: ' + existingPost.status + ')' 
      }, { status: 400 })
    }

    // Get optional scheduling data from request body
    const body = await request.json().catch(() => ({}))
    const { scheduledFor } = body

    // Determine new status
    const newStatus = scheduledFor ? 'SCHEDULED' : 'APPROVED'

    // Update post
    const post = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: newStatus,
        approvedById: user.id,
        approvedAt: new Date(),
        reviewedById: user.id,
        reviewedAt: new Date(),
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
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
      message: scheduledFor ? 'Post freigegeben und geplant' : 'Post freigegeben',
    })
  } catch (error) {
    console.error('Error approving post:', error)
    return NextResponse.json({ error: 'Fehler beim Freigeben' }, { status: 500 })
  }
}
