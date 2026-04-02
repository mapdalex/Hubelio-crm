import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canEditInCompany } from '@/lib/auth'

// POST: Initialisiert Standard-Kalender fuer User/Firma
export async function POST() {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const created: string[] = []

    // 1. Persoenlicher Kalender
    const personalCalendar = await db.calendar.findFirst({
      where: {
        ownerId: session.userId,
        type: 'PERSONAL',
        isDefault: true
      }
    })

    if (!personalCalendar) {
      await db.calendar.create({
        data: {
          name: 'Mein Kalender',
          type: 'PERSONAL',
          isDefault: true,
          color: '#3b82f6',
          ownerId: session.userId,
          companyId: session.companyId || null
        }
      })
      created.push('Persoenlicher Kalender')
    }

    // 2. Firmenkalender (nur wenn Firma vorhanden)
    if (session.companyId) {
      const companyCalendar = await db.calendar.findFirst({
        where: {
          companyId: session.companyId,
          type: 'COMPANY',
          isDefault: true
        }
      })

      if (!companyCalendar && ['ADMIN', 'SUPERADMIN'].includes(session.role)) {
        await db.calendar.create({
          data: {
            name: 'Firmenkalender',
            type: 'COMPANY',
            isDefault: true,
            isPublic: true,
            color: '#10b981',
            companyId: session.companyId,
            ownerId: null
          }
        })
        created.push('Firmenkalender')
      }

      // 3. Urlaubskalender
      const vacationCalendar = await db.calendar.findFirst({
        where: {
          companyId: session.companyId,
          type: 'VACATION',
          isDefault: true
        }
      })

      if (!vacationCalendar && ['ADMIN', 'SUPERADMIN'].includes(session.role)) {
        await db.calendar.create({
          data: {
            name: 'Urlaubskalender',
            type: 'VACATION',
            isDefault: true,
            isPublic: true,
            color: '#f59e0b',
            companyId: session.companyId,
            ownerId: null
          }
        })
        created.push('Urlaubskalender')
      }
    }

    return NextResponse.json({ 
      success: true, 
      created,
      message: created.length > 0 
        ? `Erstellt: ${created.join(', ')}` 
        : 'Alle Kalender existieren bereits'
    })
  } catch (error) {
    console.error('Fehler beim Initialisieren der Kalender:', error)
    return NextResponse.json({ error: 'Fehler beim Initialisieren der Kalender' }, { status: 500 })
  }
}
