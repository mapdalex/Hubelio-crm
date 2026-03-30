import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCurrentCompanyId } from '@/lib/multi-tenant'
import { ModuleId, SubscriptionStatus, SubscriptionTier } from '@prisma/client'

// GET /api/subscriptions - Get company subscriptions
export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const companyId = await getCurrentCompanyId()
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Keine Firma ausgewählt' },
        { status: 400 }
      )
    }
    
    const subscriptions = await db.subscription.findMany({
      where: { companyId },
      include: {
        module: true,
      },
      orderBy: { module: { sortOrder: 'asc' } },
    })
    
    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Abonnements' },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions - Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const companyId = await getCurrentCompanyId()
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Keine Firma ausgewählt' },
        { status: 400 }
      )
    }
    
    // Check if user can manage subscriptions
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId },
      },
    })
    
    if (!companyUser || !['OWNER', 'ADMIN'].includes(companyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    const { moduleId, tier, status } = await request.json()
    
    if (!moduleId) {
      return NextResponse.json(
        { error: 'Modul ID erforderlich' },
        { status: 400 }
      )
    }
    
    // Get module by moduleId enum
    const module = await db.module.findUnique({
      where: { moduleId: moduleId as ModuleId },
    })
    
    if (!module) {
      return NextResponse.json(
        { error: 'Modul nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: module.id,
        },
      },
      create: {
        companyId,
        moduleId: module.id,
        tier: (tier as SubscriptionTier) || SubscriptionTier.FREE,
        status: (status as SubscriptionStatus) || SubscriptionStatus.ACTIVE,
      },
      update: {
        tier: tier as SubscriptionTier,
        status: status as SubscriptionStatus,
        updatedAt: new Date(),
      },
      include: {
        module: true,
      },
    })
    
    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Abonnements' },
      { status: 500 }
    )
  }
}

// DELETE /api/subscriptions - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const companyId = await getCurrentCompanyId()
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Keine Firma ausgewählt' },
        { status: 400 }
      )
    }
    
    // Check if user can manage subscriptions
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId },
      },
    })
    
    if (!companyUser || !['OWNER', 'ADMIN'].includes(companyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    const { moduleId } = await request.json()
    
    if (!moduleId) {
      return NextResponse.json(
        { error: 'Modul ID erforderlich' },
        { status: 400 }
      )
    }
    
    // Cannot cancel CORE module
    if (moduleId === 'CORE') {
      return NextResponse.json(
        { error: 'Core-Modul kann nicht gekündigt werden' },
        { status: 400 }
      )
    }
    
    // Get module by moduleId enum
    const module = await db.module.findUnique({
      where: { moduleId: moduleId as ModuleId },
    })
    
    if (!module) {
      return NextResponse.json(
        { error: 'Modul nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Update subscription to cancelled
    await db.subscription.update({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: module.id,
        },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(),
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Kündigen des Abonnements' },
      { status: 500 }
    )
  }
}
