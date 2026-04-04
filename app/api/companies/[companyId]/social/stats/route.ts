import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const session = await getSession()
    if (!session?.companyId || session.companyId !== params.companyId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const companyId = params.companyId

    // Zähle verbundene Accounts
    const connectedAccounts = await db.socialAccount.findMany({
      where: { companyId, isActive: true },
    })

    // Zähle geplante Posts
    const scheduledPosts = await db.socialPost.findMany({
      where: {
        companyId,
        status: 'SCHEDULED',
      },
    })

    // Zähle veröffentlichte Posts diesen Monat
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

    const publishedThisMonth = await db.socialPost.findMany({
      where: {
        companyId,
        status: 'PUBLISHED',
        publishedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    // Hole letzte Posts
    const recentPosts = await db.socialPost.findMany({
      where: { companyId },
      select: {
        id: true,
        content: true,
        status: true,
        scheduledFor: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      connectedAccounts: connectedAccounts.length,
      scheduledPosts: scheduledPosts.length,
      publishedThisMonth: publishedThisMonth.length,
      totalReach: 0, // Placeholder
      totalEngagement: 0, // Placeholder
      followers: 0, // Placeholder
      accounts: connectedAccounts,
      recentPosts,
    })
  } catch (error) {
    console.error('Fehler beim Laden der Stats:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Stats' }, { status: 500 })
  }
}
