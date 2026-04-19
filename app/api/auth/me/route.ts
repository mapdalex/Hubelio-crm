import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    return NextResponse.json({
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      companyId: session.companyId,
      companyName: session.companyName,
      companyRole: session.companyRole,
      accessibleModules: session.accessibleModules
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzerinformationen:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
