import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET: Social Post Events synchronisieren mit dem Kalender
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start und end Parameter erforderlich' }, { status: 400 })
    }

    // Hole alle geplanten Social Posts fuer die Firma
    const socialPosts = await db.socialPost.findMany({
      where: {
        companyId: session.companyId,
        status: 'SCHEDULED',
        scheduledFor: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      include: {
        targetAccounts: {
          include: {
            account: {
              select: { platform: true, accountName: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    })

    // Wandle Social Posts in Calendar Events um
    const socialPostEvents = socialPosts.map((post) => ({
      id: `social-${post.id}`,
      title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
      description: `Type: ${post.postType}\nPlattformen: ${post.targetAccounts.map((a) => a.account.accountName).join(', ')}`,
      startDate: post.scheduledFor?.toISOString() || new Date().toISOString(),
      endDate: post.scheduledFor ? new Date(post.scheduledFor.getTime() + 60 * 60 * 1000).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      eventType: 'SOCIAL_POST',
      color: '#9333ea', // Purple for social posts
      socialPostId: post.id,
      createdBy: post.createdBy,
      allDay: false,
    }))

    return NextResponse.json(socialPostEvents)
  } catch (error) {
    console.error('Fehler beim Laden der Social Post Events:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Social Post Events' }, { status: 500 })
  }
}

// POST: Neuer Social Post Event erstellen / aktualisieren
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const data = await request.json()
    const { socialPostId, scheduledFor } = data

    if (!socialPostId || !scheduledFor) {
      return NextResponse.json({ error: 'socialPostId und scheduledFor erforderlich' }, { status: 400 })
    }

    // Aktualisiere den Social Post
    const updatedPost = await db.socialPost.update({
      where: { id: socialPostId },
      data: {
        scheduledFor: new Date(scheduledFor),
      },
      include: {
        targetAccounts: {
          include: {
            account: {
              select: { platform: true, accountName: true },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Social Post Events:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Social Post Events' }, { status: 500 })
  }
}
