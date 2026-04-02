import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { CompanyRole, ModuleId } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string; userId: string }> }

// Rollen-Hierarchie fuer Berechtigungspruefung
const ROLE_HIERARCHY: CompanyRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']

// Welche Rollen kann welche Rolle bearbeiten?
const EDITABLE_ROLES: Record<string, CompanyRole[]> = {
  OWNER: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'],
  ADMIN: ['MANAGER', 'MEMBER', 'VIEWER'],
  MANAGER: ['MEMBER', 'VIEWER'],
}

// Welche Rollen kann welche Rolle vergeben?
const ASSIGNABLE_ROLES: Record<string, CompanyRole[]> = {
  OWNER: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'],
  ADMIN: ['MANAGER', 'MEMBER', 'VIEWER'],
  MANAGER: ['MEMBER', 'VIEWER'],
}

// GET /api/companies/[id]/users/[userId] - Get single company user with module permissions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id, userId } = await params
    
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
    
    const targetUser = await db.companyUser.findUnique({
      where: { id: userId },
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
        modulePermissions: true,
      },
    })
    
    if (!targetUser || targetUser.companyId !== id) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ companyUser: targetUser })
  } catch (error) {
    console.error('Get company user error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Benutzers' },
      { status: 500 }
    )
  }
}

// PUT /api/companies/[id]/users/[userId] - Update company user role and module permissions
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id, userId } = await params
    
    // Check if user can manage users
    const currentCompanyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
    })
    
    if (!currentCompanyUser || !['OWNER', 'ADMIN', 'MANAGER'].includes(currentCompanyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    // Get target user
    const targetUser = await db.companyUser.findUnique({
      where: { id: userId },
      include: { user: true },
    })
    
    if (!targetUser || targetUser.companyId !== id) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Check if current user can edit target user's role
    const editableRoles = EDITABLE_ROLES[currentCompanyUser.role] || []
    if (!editableRoles.includes(targetUser.role as CompanyRole)) {
      return NextResponse.json(
        { error: 'Sie koennen diesen Benutzer nicht bearbeiten' },
        { status: 403 }
      )
    }
    
    const { role, modulePermissions } = await request.json()
    
    // Validate role if provided
    if (role) {
      const assignableRoles = ASSIGNABLE_ROLES[currentCompanyUser.role] || []
      if (!assignableRoles.includes(role)) {
        return NextResponse.json(
          { error: `Sie koennen keine ${role}-Rolle vergeben` },
          { status: 403 }
        )
      }
    }
    
    // Get company's subscribed modules to validate permissions
    const companySubscriptions = await db.subscription.findMany({
      where: { 
        companyId: id,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { module: true },
    })
    
    const subscribedModuleIds = new Set(
      companySubscriptions.map(sub => sub.module.moduleId)
    )
    // CORE is always available
    subscribedModuleIds.add('CORE')
    
    // Validate module permissions against company subscriptions
    if (modulePermissions && Array.isArray(modulePermissions)) {
      for (const perm of modulePermissions) {
        if (!subscribedModuleIds.has(perm.moduleId)) {
          return NextResponse.json(
            { error: `Modul ${perm.moduleId} ist fuer diese Firma nicht freigeschaltet` },
            { status: 400 }
          )
        }
      }
    }
    
    // Update user role if provided
    if (role) {
      await db.companyUser.update({
        where: { id: userId },
        data: { role: role as CompanyRole },
      })
    }
    
    // Update module permissions if provided
    if (modulePermissions && Array.isArray(modulePermissions)) {
      // Delete existing permissions
      await db.modulePermission.deleteMany({
        where: { companyUserId: userId },
      })
      
      // Create new permissions
      for (const perm of modulePermissions) {
        await db.modulePermission.create({
          data: {
            companyUserId: userId,
            moduleId: perm.moduleId as ModuleId,
            canAccess: perm.canAccess ?? true,
            canEdit: perm.canEdit ?? false,
            canAdmin: perm.canAdmin ?? false,
          },
        })
      }
    }
    
    // Get updated user with permissions
    const updatedUser = await db.companyUser.findUnique({
      where: { id: userId },
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
        modulePermissions: true,
      },
    })
    
    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'UPDATE',
        entity: 'CompanyUser',
        entityId: userId,
        details: `Benutzer ${targetUser.user.email} aktualisiert${role ? ` (neue Rolle: ${role})` : ''}${modulePermissions ? ' (Modulrechte geaendert)' : ''}`,
      },
    })
    
    return NextResponse.json({ companyUser: updatedUser })
  } catch (error) {
    console.error('Update company user error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Benutzers' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id]/users/[userId] - Remove user from company
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { id, userId } = await params
    
    // Check if user can manage users
    const currentCompanyUser = await db.companyUser.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id },
      },
    })
    
    if (!currentCompanyUser || !['OWNER', 'ADMIN', 'MANAGER'].includes(currentCompanyUser.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }
    
    // Get target user
    const targetUser = await db.companyUser.findUnique({
      where: { id: userId },
      include: { user: true },
    })
    
    if (!targetUser || targetUser.companyId !== id) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }
    
    // Check if current user can delete target user
    const editableRoles = EDITABLE_ROLES[currentCompanyUser.role] || []
    if (!editableRoles.includes(targetUser.role as CompanyRole)) {
      return NextResponse.json(
        { error: 'Sie koennen diesen Benutzer nicht entfernen' },
        { status: 403 }
      )
    }
    
    // Prevent self-deletion
    if (targetUser.userId === session.userId) {
      return NextResponse.json(
        { error: 'Sie koennen sich nicht selbst entfernen' },
        { status: 400 }
      )
    }
    
    // Prevent deletion of last owner
    if (targetUser.role === 'OWNER') {
      const ownerCount = await db.companyUser.count({
        where: { companyId: id, role: 'OWNER' },
      })
      
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Der letzte Eigentuemer kann nicht entfernt werden' },
          { status: 400 }
        )
      }
    }
    
    // Delete module permissions first
    await db.modulePermission.deleteMany({
      where: { companyUserId: userId },
    })
    
    // Delete company user
    await db.companyUser.delete({
      where: { id: userId },
    })
    
    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'DELETE',
        entity: 'CompanyUser',
        entityId: userId,
        details: `Benutzer ${targetUser.user.email} aus der Firma entfernt`,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete company user error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Entfernen des Benutzers' },
      { status: 500 }
    )
  }
}
