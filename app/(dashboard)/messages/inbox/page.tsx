import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmailInbox } from '@/components/email/email-inbox'

export const dynamic = 'force-dynamic'

async function EmailInboxData() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  const isEmployee = ['ADMIN', 'MITARBEITER', 'BUCHHALTUNG', 'SUPERADMIN'].includes(session.role)
  
  if (!isEmployee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Zugriff verweigert.</p>
      </div>
    )
  }

  // Check module access
  if (!session.accessibleModules?.includes('MESSAGE') && !session.accessibleModules?.includes('CORE')) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sie haben keinen Zugriff auf das Nachrichten-Modul.</p>
      </div>
    )
  }
  
  const companyId = session.companyId
  
  // Get email accounts for this company
  const emailAccounts = await db.emailSettings.findMany({
    where: {
      companyId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      username: true,
      accountType: true,
    },
    orderBy: { name: 'asc' },
  })

  // Get email stats per account
  const accountStats = await Promise.all(
    emailAccounts.map(async (account) => {
      const [total, unread] = await Promise.all([
        db.emailMessage.count({
          where: { emailSettingsId: account.id, folder: 'INBOX', isDeleted: false },
        }),
        db.emailMessage.count({
          where: { emailSettingsId: account.id, folder: 'INBOX', isDeleted: false, isRead: false },
        }),
      ])
      return { ...account, total, unread }
    })
  )

  // Get recent emails from all accounts
  const recentEmails = await db.emailMessage.findMany({
    where: {
      companyId,
      folder: 'INBOX',
      isDeleted: false,
    },
    orderBy: { receivedAt: 'desc' },
    take: 50,
    include: {
      emailSettings: {
        select: { id: true, name: true, displayName: true },
      },
      ticket: {
        select: { id: true, ticketNumber: true, status: true },
      },
    },
  })

  return (
    <EmailInbox 
      accounts={accountStats}
      companyId={companyId || undefined}
      initialEmails={recentEmails.map(email => ({
        ...email,
        receivedAt: email.receivedAt?.toISOString() || null,
        sentAt: email.sentAt?.toISOString() || null,
        createdAt: email.createdAt.toISOString(),
        updatedAt: email.updatedAt.toISOString(),
        emailSettings: email.emailSettings,
        ticket: email.ticket,
      }))}
    />
  )
}

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Posteingang</h1>
        <p className="text-muted-foreground">E-Mails verwalten und beantworten</p>
      </div>
      
      <Suspense fallback={<InboxSkeleton />}>
        <EmailInboxData />
      </Suspense>
    </div>
  )
}

function InboxSkeleton() {
  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      <div className="w-64 bg-muted/50 rounded-lg animate-pulse" />
      <div className="flex-1 bg-muted/50 rounded-lg animate-pulse" />
    </div>
  )
}
