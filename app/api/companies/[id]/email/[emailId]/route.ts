import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; emailId: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId, emailId } = await params
    const data = await request.json()

    // Verify user is admin of this company
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId,
        role: 'ADMIN',
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify email settings belongs to this company
    const existing = await db.emailSettings.findFirst({
      where: { id: emailId, companyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Build update data - only update fields that are provided
    const updateData: Record<string, unknown> = {
      name: data.name,
      displayName: data.displayName || null,
      protocol: data.protocol,
      host: data.host,
      port: data.port,
      username: data.username,
      useSsl: data.useSsl,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUsername: data.smtpUsername,
      smtpUseSsl: data.smtpUseSsl,
      accountType: data.accountType || 'STANDARD',
      createTicketOnReceive: data.createTicketOnReceive || false,
      autoAssignToUserId: data.autoAssignToUserId || null,
    }

    // Only update passwords if they are provided (not empty)
    if (data.password) {
      updateData.password = data.password
    }
    if (data.smtpPassword) {
      updateData.smtpPassword = data.smtpPassword
    }

    const emailSettings = await db.emailSettings.update({
      where: { id: emailId },
      data: updateData,
    })

    return NextResponse.json({ settings: emailSettings })
  } catch (error) {
    console.error('[v0] Error updating email settings:', error)
    return NextResponse.json({ error: 'Error updating settings' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; emailId: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = params.id
    const emailId = params.emailId

    // Verify user is admin
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId,
        role: 'ADMIN',
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.emailSettings.delete({
      where: { id: emailId },
    })

    return NextResponse.json({ message: 'Email settings deleted' })
  } catch (error) {
    console.error('[v0] Error deleting email settings:', error)
    return NextResponse.json({ error: 'Error deleting settings' }, { status: 500 })
  }
}
