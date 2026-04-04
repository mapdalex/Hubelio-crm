import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/companies/[id]/social/accounts/[accountId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id, accountId } = await params

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

    const account = await prisma.socialAccount.findFirst({
      where: { 
        id: accountId,
        id,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ 
      account: { ...account, accessToken: '***hidden***', refreshToken: account.refreshToken ? '***hidden***' : null }
    })
  } catch (error) {
    console.error('Error fetching social account:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Accounts' }, { status: 500 })
  }
}

// PATCH /api/companies/[id]/social/accounts/[accountId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id, accountId } = await params

    // Check company access and role
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
    const { isActive, accountName } = body

    const account = await prisma.socialAccount.update({
      where: { 
        id: accountId,
        id, // Ensure account belongs to this company
      },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(accountName && { accountName }),
      },
    })

    return NextResponse.json({ 
      account: { ...account, accessToken: '***hidden***', refreshToken: account.refreshToken ? '***hidden***' : null },
      message: 'Account aktualisiert',
    })
  } catch (error) {
    console.error('Error updating social account:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Accounts' }, { status: 500 })
  }
}

// DELETE /api/companies/[id]/social/accounts/[accountId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id, accountId } = await params

    // Check company access and role (only ADMIN and OWNER can delete)
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

    if (companyUser && !['ADMIN', 'OWNER'].includes(companyUser.role)) {
      return NextResponse.json({ error: 'Nur Admins koennen Accounts loeschen' }, { status: 403 })
    }

    // Verify account exists and belongs to company
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        id,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 })
    }

    // Delete the account (cascades to SocialPostAccount)
    await prisma.socialAccount.delete({
      where: { id: accountId },
    })

    return NextResponse.json({ message: 'Account geloescht' })
  } catch (error) {
    console.error('Error deleting social account:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen des Accounts' }, { status: 500 })
  }
}
