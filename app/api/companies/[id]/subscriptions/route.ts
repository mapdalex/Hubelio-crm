import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Prüfen, ob der Benutzer Zugriff auf diese Firma hat
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId: session.userId,
          companyId: id,
        },
      },
    })

    if (!companyUser) {
      return NextResponse.json(
        { error: 'Zugriff verweigert' },
        { status: 403 }
      )
    }

    // Alle Subscriptions dieser Firma abrufen
    const subscriptions = await db.subscription.findMany({
      where: { companyId: id },
      include: {
        module: {
          select: {
            moduleId: true,
            name: true,
            description: true,
            icon: true,
            basePrice: true,
            status: true,
          },
        },
      },
      orderBy: { module: { sortOrder: 'asc' } },
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Subscriptions' },
      { status: 500 }
    )
  }
}
