import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isSuperAdmin } from '@/lib/auth'

// Maximale Anzahl von Ownern pro Firma
const MAX_OWNERS_PER_COMPANY = 2

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/superadmin/companies/[id]/add-owner - Add owner to company (Superadmin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail erforderlich' },
        { status: 400 }
      )
    }
    
    // Check if company exists
    const company = await db.company.findUnique({
      where: { id },
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Check current owner count
    const ownerCount = await db.companyUser.count({
      where: {
        companyId: id,
        role: 'OWNER',
      },
    })
    
    if (ownerCount >= MAX_OWNERS_PER_COMPANY) {
      return NextResponse.json(
        { error: `Maximal ${MAX_OWNERS_PER_COMPANY} Eigentuemer pro Firma erlaubt` },
        { status: 400 }
      )
    }
    
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Check if user is already in company
    const existingCompanyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: user.id, companyId: id },
      },
    })
    
    if (existingCompanyUser) {
      // Update existing role to OWNER
      await db.companyUser.update({
        where: {
          userId_companyId: { userId: user.id, companyId: id },
        },
        data: { role: 'OWNER' },
      })
      
      // Log activity
      await db.activityLog.create({
        data: {
          userId: session.userId,
          companyId: id,
          action: 'UPDATE',
          entity: 'CompanyUser',
          entityId: existingCompanyUser.id,
          details: `Benutzer ${user.email} zum Eigentuemer befoerdert`,
        },
      })
      
      return NextResponse.json({
        success: true,
        message: 'Benutzer zum Eigentuemer befoerdert',
      })
    }
    
    // Add user as owner to company
    const companyUser = await db.companyUser.create({
      data: {
        userId: user.id,
        companyId: id,
        role: 'OWNER',
        isDefault: false,
      },
    })
    
    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'CREATE',
        entity: 'CompanyUser',
        entityId: companyUser.id,
        details: `Benutzer ${user.email} als Eigentuemer zur Firma ${company.name} hinzugefuegt`,
      },
    })
    
    return NextResponse.json({
      success: true,
      companyUser: {
        id: companyUser.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: companyUser.role,
      },
    })
  } catch (error) {
    console.error('Add owner error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hinzufuegen des Eigentuemers' },
      { status: 500 }
    )
  }
}
