import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

// GET: Alle Kalender des Users (eigene + freigegebene + Firmenkalender)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Hole alle Kalender die der User sehen darf:
    // 1. Eigene Kalender
    // 2. Freigegebene Kalender
    // 3. Oeffentliche Firmenkalender (COMPANY, VACATION)
    
    const calendars = await db.calendar.findMany({
      where: {
        OR: [
          // Eigene Kalender
          { ownerId: session.userId },
          // Freigegebene Kalender
          { shares: { some: { userId: session.userId } } },
          // Oeffentliche Firmenkalender der eigenen Firma
          ...(session.companyId ? [
            { companyId: session.companyId, isPublic: true }
          ] : [])
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        shares: {
          where: { userId: session.userId },
          select: { canEdit: true }
        },
        visibility: {
          where: { userId: session.userId },
          select: { isVisible: true }
        },
        _count: {
          select: { events: true }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    // Formatiere die Kalender mit Sichtbarkeit
    const formattedCalendars = calendars.map(cal => ({
      ...cal,
      isVisible: cal.visibility[0]?.isVisible ?? true,
      canEdit: cal.ownerId === session.userId || 
               cal.shares[0]?.canEdit || 
               (cal.type === 'VACATION' && canEditInCompany(session)) ||
               (cal.type === 'COMPANY' && ['ADMIN', 'SUPERADMIN'].includes(session.role)),
      isOwner: cal.ownerId === session.userId
    }))

    return NextResponse.json(formattedCalendars)
  } catch (error) {
    console.error('Fehler beim Laden der Kalender:', error)
    return NextResponse.json({ error: 'Fehler beim Laden der Kalender' }, { status: 500 })
  }
}

// POST: Neuen Kalender erstellen
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const data = await request.json()
    const { name, description, color, type, isPublic } = data

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    // Nur Admins koennen COMPANY oder VACATION Kalender erstellen
    if ((type === 'COMPANY' || type === 'VACATION') && !['ADMIN', 'SUPERADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung fuer diesen Kalendertyp' }, { status: 403 })
    }

    const calendar = await db.calendar.create({
      data: {
        name,
        description: description || null,
        color: color || '#3b82f6',
        type: type || 'PERSONAL',
        isPublic: isPublic || type === 'COMPANY' || type === 'VACATION',
        companyId: session.companyId || null,
        ownerId: (type === 'COMPANY' || type === 'VACATION') ? null : session.userId
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(calendar, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Kalenders:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen des Kalenders' }, { status: 500 })
  }
}
