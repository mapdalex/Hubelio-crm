import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { EmailService, syncCompanyEmails } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const companyId = searchParams.get('companyId')

    // Single account sync
    if (accountId) {
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

      const service = new EmailService(accountId)
      const result = await service.syncEmails()

      return NextResponse.json({ result })
    }

    // Company-wide sync
    if (companyId) {
      // Check if user has access to this company
      const companyUser = await db.companyUser.findFirst({
        where: {
          userId: session.userId,
          companyId,
          role: { in: ['ADMIN', 'OWNER'] },
        },
      })

      if (!companyUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const results = await syncCompanyEmails(companyId)

      return NextResponse.json({ results })
    }

    return NextResponse.json(
      { error: 'Either accountId or companyId is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[v0] Error syncing emails:', error)
    return NextResponse.json({ error: 'Error syncing emails' }, { status: 500 })
  }
}
