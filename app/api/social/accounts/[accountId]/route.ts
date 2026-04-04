import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type RouteParams = { params: Promise<{ accountId: string }> }

// GET /api/social/accounts/[accountId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    const { accountId } = await params

    const account = await db.socialAccount.findFirst({
      where: { id: accountId, companyId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 })
    }

    // Don't return tokens
    const safeAccount = {
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
    }

    return NextResponse.json({ account: safeAccount })
  } catch (error) {
    console.error('Error fetching social account:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Accounts' }, { status: 500 })
  }
}

// PATCH /api/social/accounts/[accountId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    if (!['ADMIN', 'MANAGER', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { accountId } = await params
    const data = await request.json()

    const account = await db.socialAccount.findFirst({
      where: { id: accountId, companyId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 })
    }

    const updated = await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: data.isActive,
      },
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error('Error updating social account:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

// DELETE /api/social/accounts/[accountId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const companyId = user.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Keine Firma zugeordnet' }, { status: 400 })
    }

    if (!['ADMIN', 'OWNER'].includes(user.companyRole || '')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { accountId } = await params

    const account = await db.socialAccount.findFirst({
      where: { id: accountId, companyId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account nicht gefunden' }, { status: 404 })
    }

    await db.socialAccount.delete({
      where: { id: accountId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting social account:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen' }, { status: 500 })
  }
}
