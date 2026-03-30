import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { CompanyRole, ModuleId } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/companies/[id]/users - Get company users
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
    })
    
    if (!companyUser) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf diese Firma' },
        { status: 403 }
      )
    }
    
    const users = await db.companyUser.findMany({
      where: { companyId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
          },
        },
        modulePermissions: true,
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get company users error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/users - Add user to company
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    
    // Check if user can manage users
    const companyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
    })
    
    if (!companyUser || !['OWNER', 'ADMIN', 'MANAGER'].includes(companyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    const { userId, email, role, modulePermissions } = await request.json()
    
    let targetUserId = userId
    
    // If email provided instead of userId, find user
    if (!targetUserId && email) {
      const user = await db.user.findUnique({
        where: { email },
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'Benutzer nicht gefunden' },
          { status: 404 }
        )
      }
      
      targetUserId = user.id
    }
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Benutzer ID oder E-Mail erforderlich' },
        { status: 400 }
      )
    }
    
    // Check if user already in company
    const existing = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: targetUserId, companyId: id },
      },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Benutzer ist bereits Mitglied dieser Firma' },
        { status: 400 }
      )
    }
    
    // Cannot add user with higher role than self
    const roleHierarchy = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']
    const selfRoleIndex = roleHierarchy.indexOf(companyUser.role)
    const newRoleIndex = roleHierarchy.indexOf(role || 'MEMBER')
    
    if (newRoleIndex < selfRoleIndex) {
      return NextResponse.json(
        { error: 'Kann keinen Benutzer mit höherer Rolle hinzufügen' },
        { status: 403 }
      )
    }
    
    // Add user to company
    const newCompanyUser = await db.companyUser.create({
      data: {
        userId: targetUserId,
        companyId: id,
        role: (role as CompanyRole) || CompanyRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })
    
    // Add module permissions if provided
    if (modulePermissions && Array.isArray(modulePermissions)) {
      for (const perm of modulePermissions) {
        await db.modulePermission.create({
          data: {
            companyUserId: newCompanyUser.id,
            moduleId: perm.moduleId as ModuleId,
            canAccess: perm.canAccess ?? true,
            canEdit: perm.canEdit ?? false,
            canAdmin: perm.canAdmin ?? false,
          },
        })
      }
    }
    
    return NextResponse.json({ companyUser: newCompanyUser })
  } catch (error) {
    console.error('Add company user error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen des Benutzers' },
      { status: 500 }
    )
  }
}
