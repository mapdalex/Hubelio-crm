import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/social/accounts - Get social accounts for current user's company
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

    const accounts = await db.socialAccount.findMany({
      where: { companyId },
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
    })

    // Don't return tokens to client
    const safeAccounts = accounts.map(account => ({
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
    }))

    return NextResponse.json({ accounts: safeAccounts })
  } catch (error) {
    console.error('Error fetching social accounts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Accounts' }, { status: 500 })
  }
}

// POST /api/social/accounts - Create social account (internal use after OAuth)
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

    // Check permissions
    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const data = await request.json()

    // Check if account already exists
    const existing = await db.socialAccount.findFirst({
      where: {
        companyId,
        platform: data.platform,
        accountId: data.accountId,
      },
    })

    if (existing) {
      // Update existing account
      const updated = await db.socialAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpires: data.tokenExpires,
          accountName: data.accountName,
          profileUrl: data.profileUrl,
          profileImage: data.profileImage,
          isActive: true,
        },
      })

      return NextResponse.json({ account: updated, updated: true })
    }

    // Create new account
    const account = await db.socialAccount.create({
      data: {
        companyId,
        platform: data.platform,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpires: data.tokenExpires,
        profileUrl: data.profileUrl,
        profileImage: data.profileImage,
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error creating social account:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Accounts' }, { status: 500 })
  }
}
