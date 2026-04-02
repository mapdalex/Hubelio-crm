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

    // Module existieren? (moduleId kann entweder die UUID oder der Enum-Wert sein)
    let module = await db.module.findUnique({
      where: { id: moduleId },
    })

    // Falls nicht gefunden, versuche mit moduleId (Enum-Wert wie CORE, MESSAGE etc.)
    if (!module) {
      module = await db.module.findUnique({
        where: { moduleId: moduleId as any },
      })
    }

    if (!module) {
      return NextResponse.json(
        { error: 'Modul nicht gefunden: ' + moduleId },
        { status: 404 }
      )
    }

    // Subscription erstellen oder aktualisieren (verwende immer module.id)
    const subscription = await db.subscription.upsert({
      where: {
        companyId_moduleId: {
          companyId: id,
          moduleId: module.id,
        },
      },
      create: {
        companyId: id,
        moduleId: module.id,
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
    const moduleIdParam = searchParams.get('moduleId')

    if (!moduleIdParam) {
      return NextResponse.json(
        { error: 'moduleId ist erforderlich' },
        { status: 400 }
      )
    }

    // Module finden - moduleIdParam kann entweder UUID oder Enum-Wert sein
    let module = await db.module.findUnique({
      where: { id: moduleIdParam },
    })

    // Falls nicht gefunden, versuche mit moduleId (Enum-Wert wie CORE, MESSAGE etc.)
    if (!module) {
      module = await db.module.findUnique({
        where: { moduleId: moduleIdParam as any },
      })
    }

    if (!module) {
      return NextResponse.json(
        { error: 'Modul nicht gefunden: ' + moduleIdParam },
        { status: 404 }
      )
    }

    // Subscription löschen mit der internen module.id
    await db.subscription.delete({
      where: {
        companyId_moduleId: {
          companyId: id,
          moduleId: module.id,
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
