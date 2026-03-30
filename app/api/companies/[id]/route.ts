import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/companies/[id] - Get company details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    // Verify user has access to company
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
      include: {
        company: {
          include: {
            subscriptions: {
              include: { module: true },
            },
            companyUsers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    })
    
    if (!companyUser) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf diese Firma' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      company: companyUser.company,
      role: companyUser.role,
    })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Firma' },
      { status: 500 }
    )
  }
}

// PATCH /api/companies/[id] - Update company
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    // Check if user can manage company
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
    })
    
    if (!companyUser || !['OWNER', 'ADMIN'].includes(companyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    const data = await request.json()
    
    // Update company
    const company = await db.company.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        logo: data.logo,
        timezone: data.timezone,
        currency: data.currency,
      },
    })
    
    return NextResponse.json({ company })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Firma' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id] - Delete company (owner only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    // Only owner can delete
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
    })
    
    if (!companyUser || companyUser.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Nur der Eigentümer kann die Firma löschen' },
        { status: 403 }
      )
    }
    
    // Delete company (cascades to related records)
    await db.company.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Firma' },
      { status: 500 }
    )
  }
}
