import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/companies/[id]/social/accounts - Liste aller Social Accounts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params

    // Check company access
    const companyUser = await prisma.companyUser.findUnique({
      where: {
        userId_id: {
          userId: user.id,
          id,
        },
      },
    })

    if (!companyUser && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Firma' }, { status: 403 })
    }

    const accounts = await prisma.socialAccount.findMany({
      where: { id },
      orderBy: { createdAt: 'desc' },
    })

    // Hide sensitive data
    const safeAccounts = accounts.map((account) => ({
      ...account,
      accessToken: '***hidden***',
      refreshToken: account.refreshToken ? '***hidden***' : null,
    }))

    return NextResponse.json({ accounts: safeAccounts })
  } catch (error) {
    console.error('Error fetching social accounts:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Accounts' }, { status: 500 })
  }
}

// POST /api/companies/[id]/social/accounts - Neuen Account hinzufuegen (nach OAuth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params

    // Check company access and role (only ADMIN, MANAGER, OWNER can add accounts)
    const companyUser = await prisma.companyUser.findUnique({
      where: {
        userId_id: {
          userId: user.id,
          id,
        },
      },
    })

    if (!companyUser && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Firma' }, { status: 403 })
    }

    if (companyUser && !['ADMIN', 'MANAGER', 'OWNER'].includes(companyUser.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const body = await request.json()
    const { platform, accountName, accountId, accessToken, refreshToken, tokenExpires, profileUrl, profileImage } = body

    if (!platform || !accountName || !accountId || !accessToken) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    // Check if account already exists
    const existingAccount = await prisma.socialAccount.findUnique({
      where: {
        id_platform_accountId: {
          id,
          platform,
          accountId,
        },
      },
    })

    if (existingAccount) {
      // Update existing account with new tokens
      const updatedAccount = await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken,
          refreshToken,
          tokenExpires: tokenExpires ? new Date(tokenExpires) : null,
          profileUrl,
          profileImage,
          isActive: true,
        },
      })

      return NextResponse.json({ 
        account: { ...updatedAccount, accessToken: '***hidden***', refreshToken: '***hidden***' },
        message: 'Account aktualisiert',
      })
    }

    // Create new account
    const account = await prisma.socialAccount.create({
      data: {
        id,
        platform,
        accountName,
        accountId,
        accessToken,
        refreshToken,
        tokenExpires: tokenExpires ? new Date(tokenExpires) : null,
        profileUrl,
        profileImage,
      },
    })

    return NextResponse.json({ 
      account: { ...account, accessToken: '***hidden***', refreshToken: '***hidden***' },
      message: 'Account verbunden',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating social account:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Accounts' }, { status: 500 })
  }
}
