import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { EmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { accountId, to, subject, text, html, replyToEmailId } = data

    if (!accountId || !to || !subject) {
      return NextResponse.json(
        { error: 'Account ID, recipient, and subject are required' },
        { status: 400 }
      )
    }

    // Verify access to this email account
    const emailSettings = await db.emailSettings.findUnique({
      where: { id: accountId },
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

    // Get reply context if replying
    let inReplyTo: string | undefined
    let references: string | undefined

    if (replyToEmailId) {
      const originalEmail = await db.emailMessage.findUnique({
        where: { id: replyToEmailId },
      })

      if (originalEmail) {
        inReplyTo = originalEmail.messageId
        references = originalEmail.threadId || originalEmail.messageId
      }
    }

    const service = new EmailService(accountId)
    const success = await service.sendEmail({
      to,
      subject,
      text,
      html,
      inReplyTo,
      references,
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error sending email:', error)
    return NextResponse.json({ error: 'Error sending email' }, { status: 500 })
  }
}
