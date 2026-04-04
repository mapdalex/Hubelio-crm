import { db } from './db'
import type { EmailSettings, EmailMessage } from '@prisma/client'

// Type definitions for imapflow
interface ImapFlowConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  logger: boolean
}

interface ImapMessage {
  uid: number
  envelope: {
    messageId: string
    date: Date
    subject: string
    from: Array<{ name?: string; address: string }>
    to: Array<{ name?: string; address: string }>
    cc?: Array<{ name?: string; address: string }>
    inReplyTo?: string
    references?: string
  }
  source: Buffer
}

interface ParsedMail {
  messageId: string
  subject: string
  from?: { text: string; value: Array<{ name?: string; address?: string }> }
  to?: { text: string; value: Array<{ name?: string; address?: string }> }
  cc?: { text: string }
  date?: Date
  text?: string
  html?: string | false
  inReplyTo?: string
  references?: string | string[]
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    content: Buffer
    contentId?: string
  }>
}

export interface EmailSyncResult {
  success: boolean
  synced: number
  errors: string[]
  ticketsCreated: number
}

export interface SendEmailParams {
  to: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
}

/**
 * Email Service for IMAP/SMTP operations
 */
export class EmailService {
  private emailSettingsId: string
  private settings: EmailSettings | null = null

  constructor(emailSettingsId: string) {
    this.emailSettingsId = emailSettingsId
  }

  /**
   * Load email settings from database
   */
  async loadSettings(): Promise<EmailSettings> {
    if (this.settings) return this.settings

    const settings = await db.emailSettings.findUnique({
      where: { id: this.emailSettingsId },
    })

    if (!settings) {
      throw new Error('Email settings not found')
    }

    this.settings = settings
    return settings
  }

  /**
   * Fetch new emails from IMAP server
   */
  async syncEmails(): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      success: false,
      synced: 0,
      errors: [],
      ticketsCreated: 0,
    }

    try {
      const settings = await this.loadSettings()
      
      // Dynamic import to avoid issues in edge runtime
      const { ImapFlow } = await import('imapflow')
      const { simpleParser } = await import('mailparser')

      const client = new ImapFlow({
        host: settings.host,
        port: settings.port,
        secure: settings.useSsl,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
        logger: false,
      } as ImapFlowConfig)

      await client.connect()

      // Select INBOX
      const mailbox = await client.mailboxOpen('INBOX')
      
      // Get the last synced date or sync from last 30 days
      const lastSync = settings.lastSync || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      // Search for messages since last sync
      const messages = client.fetch(
        { since: lastSync },
        { envelope: true, source: true, uid: true }
      )

      for await (const message of messages) {
        try {
          const parsed = await simpleParser(message.source) as ParsedMail
          
          // Check if message already exists
          const existing = await db.emailMessage.findFirst({
            where: {
              emailSettingsId: this.emailSettingsId,
              messageId: parsed.messageId || message.uid.toString(),
            },
          })

          if (existing) continue

          // Extract thread ID from references or in-reply-to
          let threadId = null
          if (parsed.inReplyTo) {
            // Find existing message with this ID to get thread
            const parentMessage = await db.emailMessage.findFirst({
              where: {
                emailSettingsId: this.emailSettingsId,
                messageId: parsed.inReplyTo,
              },
            })
            threadId = parentMessage?.threadId || parsed.inReplyTo
          } else if (parsed.references) {
            const refs = Array.isArray(parsed.references) 
              ? parsed.references[0] 
              : parsed.references.split(' ')[0]
            threadId = refs
          }

          // Create snippet from text
          const snippet = parsed.text 
            ? parsed.text.substring(0, 200).replace(/\s+/g, ' ').trim()
            : null

          // Create email message
          const emailMessage = await db.emailMessage.create({
            data: {
              companyId: settings.companyId,
              emailSettingsId: this.emailSettingsId,
              messageId: parsed.messageId || `uid-${message.uid}`,
              threadId: threadId || parsed.messageId || `uid-${message.uid}`,
              folder: 'INBOX',
              fromAddress: parsed.from?.value[0]?.address || 'unknown',
              fromName: parsed.from?.value[0]?.name || null,
              toAddress: parsed.to?.value[0]?.address || settings.username,
              toName: parsed.to?.value[0]?.name || null,
              cc: parsed.cc?.text || null,
              subject: parsed.subject || '(Kein Betreff)',
              bodyText: parsed.text || null,
              bodyHtml: typeof parsed.html === 'string' ? parsed.html : null,
              snippet,
              receivedAt: parsed.date || new Date(),
              hasAttachments: (parsed.attachments?.length || 0) > 0,
            },
          })

          result.synced++

          // Auto-create ticket if enabled
          if (settings.accountType === 'TICKET_SYSTEM' && settings.createTicketOnReceive) {
            // Only create ticket for new conversations (not replies)
            if (!parsed.inReplyTo) {
              const ticketResult = await this.createTicketFromEmail(emailMessage, settings)
              if (ticketResult) {
                result.ticketsCreated++
              }
            } else {
              // Link to existing ticket if this is a reply
              await this.linkReplyToTicket(emailMessage, parsed.inReplyTo)
            }
          }
        } catch (msgError) {
          console.error('[v0] Error processing message:', msgError)
          result.errors.push(`Error processing message: ${msgError instanceof Error ? msgError.message : 'Unknown'}`)
        }
      }

      await client.logout()

      // Update last sync time
      await db.emailSettings.update({
        where: { id: this.emailSettingsId },
        data: { lastSync: new Date() },
      })

      result.success = true
    } catch (error) {
      console.error('[v0] Email sync error:', error)
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Create a ticket from an email
   */
  private async createTicketFromEmail(
    email: EmailMessage,
    settings: EmailSettings
  ): Promise<string | null> {
    try {
      // Generate ticket number
      const ticketCount = await db.ticket.count({
        where: { companyId: settings.companyId },
      })
      const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`

      // Try to find customer by email
      const customer = await db.customer.findFirst({
        where: {
          companyId: settings.companyId,
          email: email.fromAddress,
        },
      })

      // Find a default user to create ticket (use autoAssign or first admin)
      let createdById = settings.autoAssignToUserId
      if (!createdById) {
        const adminUser = await db.companyUser.findFirst({
          where: {
            companyId: settings.companyId!,
            role: 'ADMIN',
          },
          include: { user: true },
        })
        createdById = adminUser?.userId
      }

      if (!createdById) {
        console.error('[v0] No user found to create ticket')
        return null
      }

      // Create the ticket
      const ticket = await db.ticket.create({
        data: {
          companyId: settings.companyId,
          ticketNumber,
          subject: email.subject,
          description: email.bodyText || email.bodyHtml || 'E-Mail ohne Text',
          status: 'OPEN',
          priority: 'MEDIUM',
          customerId: customer?.id || null,
          createdById,
          assignedToId: settings.autoAssignToUserId,
          emailMessageId: email.id,
        },
      })

      // Link email to ticket
      await db.emailMessage.update({
        where: { id: email.id },
        data: { ticketId: ticket.id },
      })

      return ticket.id
    } catch (error) {
      console.error('[v0] Error creating ticket from email:', error)
      return null
    }
  }

  /**
   * Link a reply email to existing ticket
   */
  private async linkReplyToTicket(
    email: EmailMessage,
    inReplyTo: string
  ): Promise<void> {
    try {
      // Find the original email
      const originalEmail = await db.emailMessage.findFirst({
        where: {
          emailSettingsId: this.emailSettingsId,
          messageId: inReplyTo,
        },
      })

      if (originalEmail?.ticketId) {
        // Link this email to the same ticket
        await db.emailMessage.update({
          where: { id: email.id },
          data: { ticketId: originalEmail.ticketId },
        })

        // Add as ticket comment
        const ticket = await db.ticket.findUnique({
          where: { id: originalEmail.ticketId },
        })

        if (ticket) {
          await db.ticketComment.create({
            data: {
              ticketId: ticket.id,
              userId: ticket.createdById,
              content: `[E-Mail von ${email.fromAddress}]\n\n${email.bodyText || 'Anhang'}`,
              isInternal: false,
            },
          })
        }
      }
    } catch (error) {
      console.error('[v0] Error linking reply to ticket:', error)
    }
  }

  /**
   * Send an email via SMTP
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      const settings = await this.loadSettings()
      
      if (!settings.smtpHost) {
        throw new Error('SMTP not configured')
      }

      const nodemailer = await import('nodemailer')

      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpUseSsl,
        auth: {
          user: settings.smtpUsername || settings.username,
          pass: settings.smtpPassword || settings.password,
        },
      })

      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${settings.smtpHost}>`

      await transporter.sendMail({
        from: settings.username,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        replyTo: params.replyTo,
        inReplyTo: params.inReplyTo,
        references: params.references,
        messageId,
      })

      // Save sent email to database
      await db.emailMessage.create({
        data: {
          companyId: settings.companyId,
          emailSettingsId: this.emailSettingsId,
          messageId,
          threadId: params.inReplyTo || messageId,
          folder: 'SENT',
          fromAddress: settings.username,
          toAddress: params.to,
          subject: params.subject,
          bodyText: params.text || null,
          bodyHtml: params.html || null,
          snippet: params.text?.substring(0, 200) || null,
          receivedAt: new Date(),
          sentAt: new Date(),
          isRead: true,
        },
      })

      return true
    } catch (error) {
      console.error('[v0] Error sending email:', error)
      return false
    }
  }

  /**
   * Get emails for a specific account
   */
  static async getEmails(
    emailSettingsId: string,
    options: {
      folder?: string
      threadId?: string
      limit?: number
      offset?: number
      unreadOnly?: boolean
    } = {}
  ): Promise<EmailMessage[]> {
    const where: Record<string, unknown> = {
      emailSettingsId,
      isDeleted: false,
    }

    if (options.folder) {
      where.folder = options.folder
    }

    if (options.threadId) {
      where.threadId = options.threadId
    }

    if (options.unreadOnly) {
      where.isRead = false
    }

    return db.emailMessage.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    })
  }

  /**
   * Mark email as read
   */
  static async markAsRead(emailId: string): Promise<void> {
    await db.emailMessage.update({
      where: { id: emailId },
      data: { isRead: true },
    })
  }

  /**
   * Mark email as starred
   */
  static async toggleStar(emailId: string): Promise<boolean> {
    const email = await db.emailMessage.findUnique({
      where: { id: emailId },
    })

    if (!email) return false

    await db.emailMessage.update({
      where: { id: emailId },
      data: { isStarred: !email.isStarred },
    })

    return !email.isStarred
  }
}

/**
 * Sync all active email accounts for a company
 */
export async function syncCompanyEmails(companyId: string): Promise<EmailSyncResult[]> {
  const accounts = await db.emailSettings.findMany({
    where: {
      companyId,
      isActive: true,
    },
  })

  const results: EmailSyncResult[] = []

  for (const account of accounts) {
    const service = new EmailService(account.id)
    const result = await service.syncEmails()
    results.push(result)
  }

  return results
}
