import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isSuperAdmin } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/superadmin/companies/[id] - Get single company details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const { id } = await params
    
    const company = await db.company.findUnique({
      where: { id },
      include: {
        companyUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: { role: 'asc' },
        },
        subscriptions: {
          include: {
            module: true,
          },
        },
        _count: {
          select: {
            customers: true,
            tickets: true,
            companyUsers: true,
          },
        },
      },
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Firma' },
      { status: 500 }
    )
  }
}

// PUT /api/superadmin/companies/[id] - Update company
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const { id } = await params
    const body = await request.json()
    
    const { name, email, phone, address, website, isActive } = body
    
    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id },
    })
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Update company
    const updatedCompany = await db.company.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address: address || null }),
        ...(website !== undefined && { website: website || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    
    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'UPDATE',
        entity: 'Company',
        entityId: id,
        details: `Firma ${updatedCompany.name} aktualisiert`,
      },
    })
    
    return NextResponse.json({
      success: true,
      company: updatedCompany,
    })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Firma' },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/companies/[id] - Delete company (soft delete by deactivating)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const { id } = await params
    
    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id },
    })
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Soft delete by deactivating
    await db.company.update({
      where: { id },
      data: { isActive: false },
    })
    
    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'DELETE',
        entity: 'Company',
        entityId: id,
        details: `Firma ${existingCompany.name} deaktiviert`,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: 'Firma wurde deaktiviert',
    })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Deaktivieren der Firma' },
      { status: 500 }
    )
  }
}
