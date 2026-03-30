import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isSuperAdminUser = await isSuperAdmin()
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Nur Superadmin darf Subscriptions abrufen' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Subscriptions der Firma abrufen
    const subscriptions = await db.subscription.findMany({
      where: { companyId: id },
      include: {
        module: true,
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isSuperAdminUser = await isSuperAdmin()
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Nur Superadmin darf Subscriptions verwalten' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { moduleId, tier } = body

    if (!moduleId || !tier) {
      return NextResponse.json(
        { error: 'moduleId und tier sind erforderlich' },
        { status: 400 }
      )
    }

    // Gültige Tiers prüfen
    const validTiers = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Ungültiger Tier: ' + tier },
        { status: 400 }
      )
    }

    // Module existieren?
    const module = await db.module.findUnique({
      where: { moduleId },
    })

    if (!module) {
      return NextResponse.json(
        { error: 'Modul nicht gefunden' },
        { status: 404 }
      )
    }

    // Subscription erstellen oder aktualisieren
    const subscription = await db.subscription.upsert({
      where: {
        companyId_moduleId: {
          companyId: id,
          moduleId,
        },
      },
      create: {
        companyId: id,
        moduleId,
        tier,
      },
      update: {
        tier,
      },
      include: { module: true },
    })

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isSuperAdminUser = await isSuperAdmin()
    if (!isSuperAdminUser) {
      return NextResponse.json(
        { error: 'Nur Superadmin darf Subscriptions löschen' },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json(
        { error: 'moduleId ist erforderlich' },
        { status: 400 }
      )
    }

    // Subscription löschen
    await db.subscription.delete({
      where: {
        companyId_moduleId: {
          companyId: id,
          moduleId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Subscription' },
      { status: 500 }
    )
  }
}
