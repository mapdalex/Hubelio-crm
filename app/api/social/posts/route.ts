import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { SocialPostStatus, SocialPostType } from '@prisma/client'

// GET /api/social/posts
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as SocialPostStatus | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: { companyId: string; status?: SocialPostStatus } = { companyId }
    if (status) {
      where.status = status
    }

    const [posts, total] = await Promise.all([
      db.socialPost.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          media: { orderBy: { sortOrder: 'asc' } },
          targetAccounts: {
            include: {
              account: { select: { id: true, platform: true, accountName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.socialPost.count({ where }),
    ])

    return NextResponse.json({ posts, total })
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Posts' }, { status: 500 })
  }
}

// POST /api/social/posts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.content || !data.accountIds || data.accountIds.length === 0) {
      return NextResponse.json(
        { error: 'Inhalt und mindestens ein Account erforderlich' },
        { status: 400 }
      )
    }

    // Verify accounts belong to company
    const accounts = await db.socialAccount.findMany({
      where: {
        id: { in: data.accountIds },
        companyId,
        isActive: true,
      },
    })

    if (accounts.length !== data.accountIds.length) {
      return NextResponse.json(
        { error: 'Ungueltige oder inaktive Accounts' },
        { status: 400 }
      )
    }

    // Create post
    const post = await db.socialPost.create({
      data: {
        companyId,
        content: data.content,
        postType: (data.postType as SocialPostType) || 'POST',
        status: 'DRAFT',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        createdById: user.id,
        targetAccounts: {
          create: data.accountIds.map((accountId: string) => ({
            accountId,
            status: 'pending',
          })),
        },
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

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Posts' }, { status: 500 })
  }
}
