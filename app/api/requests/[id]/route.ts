import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isAdmin } from '@/lib/auth'

// GET: Einzelnen Antrag laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const requestData = await db.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        calendarEvent: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            calendar: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!requestData) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    // Berechtigung pruefen: Eigener Antrag oder Manager/Admin
    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'
    const isOwner = requestData.requesterId === session.userId

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Multi-tenant Check
    if (session.companyId && requestData.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ request: requestData })
  } catch (error) {
    console.error('Error fetching request:', error)
    return NextResponse.json({ error: 'Fehler beim Laden des Antrags' }, { status: 500 })
  }
}

// PATCH: Antrag bearbeiten oder Status aendern
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const existingRequest = await db.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, name: true },
        },
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    // Multi-tenant Check
    if (session.companyId && existingRequest.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'
    const isOwner = existingRequest.requesterId === session.userId

    // Nur eigene Antraege bearbeiten (wenn PENDING) oder als Manager Status aendern
    if (!isOwner && !isManager) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    // Owner kann nur PENDING Antraege bearbeiten
    if (isOwner && existingRequest.status === 'PENDING') {
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
      if (data.type !== undefined) updateData.type = data.type
    }

    // Owner kann stornieren
    if (isOwner && data.status === 'CANCELLED' && existingRequest.status === 'PENDING') {
      updateData.status = 'CANCELLED'
    }

    // Manager/Admin kann genehmigen oder ablehnen
    if (isManager && ['APPROVED', 'REJECTED'].includes(data.status)) {
      updateData.status = data.status
      updateData.approvedById = session.userId
      updateData.approvedAt = new Date()
      if (data.approvalComment) {
        updateData.approvalComment = data.approvalComment
      }

      // Bei Genehmigung von Urlaub/Sonderurlaub: Kalendereintrag erstellen
      if (data.status === 'APPROVED' && ['VACATION', 'SPECIAL_LEAVE'].includes(existingRequest.type)) {
        if (existingRequest.startDate && existingRequest.endDate) {
          // Urlaubskalender finden oder erstellen
          let vacationCalendar = await db.calendar.findFirst({
            where: {
              companyId: session.companyId,
              type: 'VACATION',
            },
          })

          if (!vacationCalendar) {
            vacationCalendar = await db.calendar.create({
              data: {
                companyId: session.companyId,
                name: 'Urlaubskalender',
                description: 'Firmenweiter Urlaubskalender',
                color: '#10b981',
                type: 'VACATION',
                isPublic: true,
              },
            })
          }

          // Event erstellen
          const eventTitle = existingRequest.type === 'VACATION' 
            ? `Urlaub: ${existingRequest.requester.name}`
            : `Sonderurlaub: ${existingRequest.requester.name}`

          const calendarEvent = await db.calendarEvent.create({
            data: {
              calendarId: vacationCalendar.id,
              title: eventTitle,
              description: existingRequest.description || undefined,
              eventType: 'VACATION',
              startDate: existingRequest.startDate,
              endDate: existingRequest.endDate,
              allDay: true,
              createdById: session.userId,
            },
          })

          updateData.calendarEventId = calendarEvent.id
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Keine Aenderungen' }, { status: 400 })
    }

    const updatedRequest = await db.request.update({
      where: { id },
      data: updateData,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        calendarEvent: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    // Activity Log
    const action = data.status === 'APPROVED' ? 'Genehmigt' : data.status === 'REJECTED' ? 'Abgelehnt' : 'Aktualisiert'
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'UPDATE',
        entity: 'Request',
        entityId: id,
        details: `Antrag ${existingRequest.requestNumber} ${action}`,
      },
    })

    return NextResponse.json({ request: updatedRequest })
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Antrags' }, { status: 500 })
  }
}

// DELETE: Antrag loeschen (nur eigene PENDING Antraege)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { id } = await params

    const existingRequest = await db.request.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    // Multi-tenant Check
    if (session.companyId && existingRequest.companyId !== session.companyId) {
      return NextResponse.json({ error: 'Antrag nicht gefunden' }, { status: 404 })
    }

    const isOwner = existingRequest.requesterId === session.userId
    const isManager = isAdmin(session.role) || session.companyRole === 'MANAGER' || session.companyRole === 'OWNER'

    // Nur eigene PENDING Antraege loeschen oder als Admin
    if (!isManager && (!isOwner || existingRequest.status !== 'PENDING')) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    await db.request.delete({
      where: { id },
    })

    // Activity Log
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: session.companyId || null,
        action: 'DELETE',
        entity: 'Request',
        entityId: id,
        details: `Antrag ${existingRequest.requestNumber} geloescht`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: 'Fehler beim Loeschen des Antrags' }, { status: 500 })
  }
}
