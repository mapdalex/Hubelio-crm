import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: emailId } = await params
    const data = await request.json()

    // Get the email
    const email = await db.emailMessage.findUnique({
      where: { id: emailId },
      include: {
        emailSettings: true,
      },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Verify access
    const companyUser = await db.companyUser.findFirst({
      where: {
        userId: session.userId,
        companyId: email.companyId!,
      },
    })

    if (!companyUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if email already has a ticket
    if (email.ticketId) {
      return NextResponse.json(
        { error: 'E-Mail ist bereits mit einem Ticket verknuepft' },
        { status: 400 }
      )
    }

    // Generate ticket number
    const ticketCount = await db.ticket.count({
      where: { companyId: email.companyId! },
    })
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`

    // Try to find customer by email
    const customer = await db.customer.findFirst({
      where: {
        companyId: email.companyId!,
        email: email.fromAddress,
      },
    })

    // Create the ticket
    const ticket = await db.ticket.create({
      data: {
        companyId: email.companyId,
        ticketNumber,
        subject: data.subject || email.subject,
        description: data.description || email.bodyText || email.bodyHtml || 'E-Mail ohne Text',
        status: 'OPEN',
        priority: data.priority || 'MEDIUM',
        customerId: data.customerId || customer?.id || null,
        createdById: session.userId,
        assignedToId: data.assignedToId || null,
        emailMessageId: email.id,
      },
    })

    // Link email to ticket
    await db.emailMessage.update({
      where: { id: emailId },
      data: { ticketId: ticket.id },
    })

    // Also link any thread messages to the same ticket
    if (email.threadId) {
      await db.emailMessage.updateMany({
        where: {
          threadId: email.threadId,
          ticketId: null,
        },
        data: { ticketId: ticket.id },
      })
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
      },
    })
  } catch (error) {
    console.error('[v0] Error creating ticket from email:', error)
    return NextResponse.json({ error: 'Error creating ticket' }, { status: 500 })
  }
}
