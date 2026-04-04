import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import type { ModuleId } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = params.id

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

    const settings = await db.emailSettings.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        displayName: true,
        protocol: true,
        host: true,
        port: true,
        username: true,
        isActive: true,
        accountType: true,
        createTicketOnReceive: true,
        lastSync: true,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[v0] Error fetching email settings:', error)
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = params.id
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

    const emailSettings = await db.emailSettings.create({
      data: {
        companyId,
        name: data.name,
        displayName: data.displayName || null,
        protocol: data.protocol,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        useSsl: data.useSsl,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername,
        smtpPassword: data.smtpPassword,
        smtpUseSsl: data.smtpUseSsl,
        accountType: data.accountType || 'STANDARD',
        createTicketOnReceive: data.createTicketOnReceive || false,
        autoAssignToUserId: data.autoAssignToUserId || null,
      },
    })

    return NextResponse.json({ settings: emailSettings }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating email settings:', error)
    return NextResponse.json({ error: 'Error creating settings' }, { status: 500 })
  }
}
