import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { EmailService } from '@/lib/email-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const email = await db.emailMessage.findUnique({
      where: { id },
      include: {
        emailSettings: {
          select: {
            id: true,
            name: true,
            displayName: true,
            username: true,
          },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
          },
        },
      },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Verify access
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId: email.companyId!,
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as read
    if (!email.isRead) {
      await EmailService.markAsRead(id)
    }

    // Get thread emails if this is part of a thread
    let threadEmails: typeof email[] = []
    if (email.threadId) {
      threadEmails = await db.emailMessage.findMany({
        where: {
          threadId: email.threadId,
          isDeleted: false,
        },
        orderBy: { receivedAt: 'asc' },
        include: {
          emailSettings: {
            select: {
              id: true,
              name: true,
              displayName: true,
              username: true,
            },
          },
        },
      })
    }

    return NextResponse.json({
      email: { ...email, isRead: true },
      thread: threadEmails,
    })
  } catch (error) {
    console.error('[v0] Error fetching email:', error)
    return NextResponse.json({ error: 'Error fetching email' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const email = await db.emailMessage.findUnique({
      where: { id },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Verify access
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId: email.companyId!,
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update allowed fields
    const updateData: Record<string, unknown> = {}
    
    if (typeof data.isRead === 'boolean') {
      updateData.isRead = data.isRead
    }
    
    if (typeof data.isStarred === 'boolean') {
      updateData.isStarred = data.isStarred
    }
    
    if (typeof data.isDeleted === 'boolean') {
      updateData.isDeleted = data.isDeleted
    }

    const updatedEmail = await db.emailMessage.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ email: updatedEmail })
  } catch (error) {
    console.error('[v0] Error updating email:', error)
    return NextResponse.json({ error: 'Error updating email' }, { status: 500 })
  }
}
