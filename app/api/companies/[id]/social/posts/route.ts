import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SocialPostStatus, SocialPostType } from '@prisma/client'

// GET /api/companies/[id]/social/posts - Liste aller Social Posts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    
    // Filter parameters
    const status = searchParams.get('status') as SocialPostStatus | null
    const postType = searchParams.get('postType') as SocialPostType | null
    const accountId = searchParams.get('accountId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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

    // Build where clause
    const where: Record<string, unknown> = { id }
    
    if (status) where.status = status
    if (postType) where.postType = postType
    
    if (startDate || endDate) {
      where.scheduledFor = {}
      if (startDate) (where.scheduledFor as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.scheduledFor as Record<string, Date>).lte = new Date(endDate)
    }

    // Get total count
    let totalCount = await prisma.socialPost.count({ where })

    // If filtering by account, we need to join through SocialPostAccount
    if (accountId) {
      const postsWithAccount = await prisma.socialPostAccount.findMany({
        where: { accountId },
        select: { postId: true },
      })
      const postIds = postsWithAccount.map(p => p.postId)
      where.id = { in: postIds }
      totalCount = postIds.length
    }

    const posts = await prisma.socialPost.findMany({
      where,
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
              select: { id: true, platform: true, accountName: true, profileImage: true },
            },
          },
        },
      },
      orderBy: [
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Posts' }, { status: 500 })
  }
}

// POST /api/companies/[id]/social/posts - Neuen Post erstellen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params

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

    const body = await request.json()
    const { content, postType, media, accountIds, scheduledFor } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Inhalt ist erforderlich' }, { status: 400 })
    }

    if (!accountIds || accountIds.length === 0) {
      return NextResponse.json({ error: 'Mindestens ein Account muss ausgewaehlt werden' }, { status: 400 })
    }

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

    // Create post with media and account connections
    const post = await prisma.socialPost.create({
      data: {
        id,
        content: content.trim(),
        postType: postType || 'POST',
        status: 'DRAFT',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        createdById: user.id,
        media: media && media.length > 0 ? {
          create: media.map((m: { type: string; url: string; thumbnail?: string; altText?: string; duration?: number; width?: number; height?: number }, index: number) => ({
            type: m.type,
            url: m.url,
            thumbnail: m.thumbnail,
            altText: m.altText,
            duration: m.duration,
            width: m.width,
            height: m.height,
            sortOrder: index,
          })),
        } : undefined,
        targetAccounts: {
          create: accountIds.map((accountId: string) => ({
            accountId,
            status: 'pending',
          })),
        },
      },
      include: {
        media: true,
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

    return NextResponse.json({ post, message: 'Post erstellt' }, { status: 201 })
  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Posts' }, { status: 500 })
  }
}
