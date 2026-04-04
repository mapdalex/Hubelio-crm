import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/companies/[id]/social/posts/[postId]/schedule
// Schedule an approved post (Manager/Admin only)
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

    // Only Manager, Admin, Owner can schedule
    if (companyUser && !['ADMIN', 'MANAGER', 'OWNER'].includes(companyUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Planen' }, { status: 403 })
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

    // Only allow scheduling if post is in APPROVED or already SCHEDULED status
    if (!['APPROVED', 'SCHEDULED'].includes(existingPost.status)) {
      return NextResponse.json({ 
        error: 'Nur freigegebene Posts koennen geplant werden (Status: ' + existingPost.status + ')' 
      }, { status: 400 })
    }

    // Get scheduling data from request body
    const body = await request.json()
    const { scheduledFor } = body

    if (!scheduledFor) {
      return NextResponse.json({ error: 'Zeitpunkt ist erforderlich' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledFor)
    
    // Validate date is in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Zeitpunkt muss in der Zukunft liegen' }, { status: 400 })
    }

    // Update post
    const post = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'SCHEDULED',
        scheduledFor: scheduledDate,
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
      message: 'Post geplant fuer ' + scheduledDate.toLocaleString('de-DE'),
    })
  } catch (error) {
    console.error('Error scheduling post:', error)
    return NextResponse.json({ error: 'Fehler beim Planen' }, { status: 500 })
  }
}
