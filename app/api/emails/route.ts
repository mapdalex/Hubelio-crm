import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { EmailService } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const folder = searchParams.get('folder') || 'INBOX'
    const threadId = searchParams.get('threadId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Verify access to this email account
    const emailSettings = await db.emailSettings.findUnique({
      where: { id: accountId },
      include: { ownerCompany: true },
    })

    if (!emailSettings) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
    }

    // Check if user has access to this company
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId: emailSettings.companyId!,
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const emails = await EmailService.getEmails(accountId, {
      folder,
      threadId: threadId || undefined,
      limit,
      offset: (page - 1) * limit,
      unreadOnly,
    })

    // Get total count
    const totalCount = await db.emailMessage.count({
      where: {
        emailSettingsId: accountId,
        folder,
        isDeleted: false,
        ...(unreadOnly ? { isRead: false } : {}),
      },
    })

    // Get unread count
    const unreadCount = await db.emailMessage.count({
      where: {
        emailSettingsId: accountId,
        isRead: false,
        isDeleted: false,
      },
    })

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    })
  } catch (error) {
    console.error('[v0] Error fetching emails:', error)
    return NextResponse.json({ error: 'Error fetching emails' }, { status: 500 })
  }
}
