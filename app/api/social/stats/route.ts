import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/social/stats - Get social media stats for current company
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

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [accounts, scheduledPosts, publishedThisMonth, recentPosts] = await Promise.all([
      db.socialAccount.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          platform: true,
          accountName: true,
          profileImage: true,
          isActive: true,
        },
      }),
      db.socialPost.count({
        where: { companyId, status: 'SCHEDULED' },
      }),
      db.socialPost.count({
        where: {
          companyId,
          status: 'PUBLISHED',
          publishedAt: { gte: startOfMonth },
        },
      }),
      db.socialPost.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          status: true,
          scheduledFor: true,
        },
      }),
    ])

    return NextResponse.json({
      connectedAccounts: accounts.length,
      scheduledPosts,
      publishedThisMonth,
      totalReach: 0,
      totalEngagement: 0,
      followers: 0,
      accounts,
      recentPosts,
    })
  } catch (error) {
    console.error('Error fetching social stats:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Statistiken' }, { status: 500 })
  }
}
