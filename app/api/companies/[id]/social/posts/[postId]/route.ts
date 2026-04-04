import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/companies/[id]/social/posts/[postId]
export async function GET(
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

    const post = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        targetAccounts: {
          include: {
            account: {
              select: { id: true, platform: true, accountName: true, profileImage: true, profileUrl: true },
            },
          },
        },
        calendarEvent: {
          select: { id: true, title: true, startDate: true },
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

// PATCH /api/companies/[id]/social/posts/[postId]
export async function PATCH(
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
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only allow editing if post is in DRAFT or REJECTED status
    if (!['DRAFT', 'REJECTED'].includes(existingPost.status)) {
      return NextResponse.json({ 
        error: 'Post kann nicht bearbeitet werden (Status: ' + existingPost.status + ')' 
      }, { status: 400 })
    }

    // Only creator or admins can edit
    const canEdit = existingPost.createdById === user.id || 
      ['ADMIN', 'MANAGER', 'OWNER'].includes(companyUser?.role || '')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Bearbeiten' }, { status: 403 })
    }

    const body = await request.json()
    const { content, postType, media, accountIds, scheduledFor } = body

    // Update post
    const updateData: Record<string, unknown> = {}
    
    if (content !== undefined) updateData.content = content.trim()
    if (postType !== undefined) updateData.postType = postType
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    
    // If post was rejected and is being edited, reset to draft
    if (existingPost.status === 'REJECTED') {
      updateData.status = 'DRAFT'
      updateData.rejectionReason = null
      updateData.reviewedById = null
      updateData.reviewedAt = null
    }

    // Handle media updates if provided
    if (media !== undefined) {
      // Delete existing media
      await prisma.socialMedia.deleteMany({
        where: { postId },
      })

      // Create new media
      if (media.length > 0) {
        await prisma.socialMedia.createMany({
          data: media.map((m: { type: string; url: string; thumbnail?: string; altText?: string; duration?: number; width?: number; height?: number }, index: number) => ({
            postId,
            type: m.type,
            url: m.url,
            thumbnail: m.thumbnail,
            altText: m.altText,
            duration: m.duration,
            width: m.width,
            height: m.height,
            sortOrder: index,
          })),
        })
      }
    }

    // Handle account updates if provided
    if (accountIds !== undefined) {
      // Verify accounts belong to this company
      const accounts = await prisma.socialAccount.findMany({
        where: {
          id: { in: accountIds },
          id,
          isActive: true,
        },
      })

      if (accounts.length !== accountIds.length) {
        return NextResponse.json({ error: 'Ungueltige oder inaktive Accounts' }, { status: 400 })
      }

      // Delete existing account connections
      await prisma.socialPostAccount.deleteMany({
        where: { postId },
      })

      // Create new account connections
      await prisma.socialPostAccount.createMany({
        data: accountIds.map((accountId: string) => ({
          postId,
          accountId,
          status: 'pending',
        })),
      })
    }

    const post = await prisma.socialPost.update({
      where: { id: postId },
      data: updateData,
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        targetAccounts: {
          include: {
            account: {
              select: { id: true, platform: true, accountName: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ post, message: 'Post aktualisiert' })
  } catch (error) {
    console.error('Error updating social post:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Posts' }, { status: 500 })
  }
}

// DELETE /api/companies/[id]/social/posts/[postId]
export async function DELETE(
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
    })

    if (!existingPost) {
      return NextResponse.json({ error: 'Post nicht gefunden' }, { status: 404 })
    }

    // Only allow deleting if post is not published
    if (existingPost.status === 'PUBLISHED') {
      return NextResponse.json({ 
        error: 'Veroeffentlichte Posts koennen nicht geloescht werden' 
      }, { status: 400 })
    }

    // Only creator or admins can delete
    const canDelete = existingPost.createdById === user.id || 
      ['ADMIN', 'OWNER'].includes(companyUser?.role || '')
    
    if (!canDelete) {
      return NextResponse.json({ error: 'Keine Berechtigung zum Loeschen' }, { status: 403 })
    }

    // Delete post (cascades to media and account connections)
    await prisma.socialPost.delete({
      where: { id: postId },
    })

    return NextResponse.json({ message: 'Post geloescht' })
  } catch (error) {
    console.error('Error deleting social post:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen des Posts' }, { status: 500 })
  }
}
