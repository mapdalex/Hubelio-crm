import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/companies/[id]/social/posts/[postId]/submit
// Submit post for review
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

    // Check company access
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

    // Get existing post
    const existingPost = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        id,
      },
      include: {
        media: true,
        targetAccounts: true,
      },
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only allow submitting if post is in DRAFT or REJECTED status
    if (!['DRAFT', 'REJECTED'].includes(existingPost.status)) {
      return NextResponse.json({ 
        error: 'Post kann nicht eingereicht werden (Status: ' + existingPost.status + ')' 
      }, { status: 400 })
    }

    // Validate post has content
    if (!existingPost.content || existingPost.content.trim().length === 0) {
      return NextResponse.json({ error: 'Post hat keinen Inhalt' }, { status: 400 })
    }

    // Validate post has at least one target account
    if (existingPost.targetAccounts.length === 0) {
      return NextResponse.json({ error: 'Kein Ziel-Account ausgewaehlt' }, { status: 400 })
    }

    // Update post status to REVIEW
    const post = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'REVIEW',
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null,
      },
      include: {
        createdBy: {
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
      message: 'Post zur Pruefung eingereicht',
    })
  } catch (error) {
    console.error('Error submitting post for review:', error)
    return NextResponse.json({ error: 'Fehler beim Einreichen' }, { status: 500 })
  }
}
