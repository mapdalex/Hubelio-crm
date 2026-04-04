import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id: companyId } = await params

    // Check company access
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

    // Zähle verbundene Accounts
    const connectedAccounts = await prisma.socialAccount.findMany({
      where: { companyId, isActive: true },
    })

    // Zähle geplante Posts
    const scheduledPostsCount = await prisma.socialPost.count({
      where: {
        companyId,
        status: 'SCHEDULED',
      },
    })

    // Zähle veröffentlichte Posts diesen Monat
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)

    const publishedThisMonthCount = await prisma.socialPost.count({
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
    const recentPosts = await prisma.socialPost.findMany({
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
      scheduledPosts: scheduledPostsCount,
      publishedThisMonth: publishedThisMonthCount,
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
