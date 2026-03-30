import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { CompanyRole, ModuleId } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

// Rollen-Hierarchie fuer Berechtigungspruefung
const ROLE_HIERARCHY = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']

// Welche Rollen kann welche Rolle vergeben?
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  OWNER: ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'],
  ADMIN: ['MANAGER', 'MEMBER', 'VIEWER'],
  MANAGER: ['MEMBER', 'VIEWER'],
}

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

// POST /api/companies/[id]/users - Add user to company (create new or add existing)
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
    
    const { 
      userId, 
      email, 
      role, 
      modulePermissions,
      // Fuer neuen Benutzer
      createNewUser,
      name,
      password,
    } = await request.json()
    
    // Pruefe ob die Rolle vergeben werden darf
    const requestedRole = role || 'MEMBER'
    const allowedRoles = ASSIGNABLE_ROLES[companyUser.role] || []
    
    if (!allowedRoles.includes(requestedRole)) {
      return NextResponse.json(
        { error: `Sie koennen keine ${requestedRole}-Rolle vergeben` },
        { status: 403 }
      )
    }
    
    let targetUserId = userId
    
    // Neuen Benutzer erstellen
    if (createNewUser && email && name && password) {
      // Pruefe ob E-Mail bereits existiert
      const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'E-Mail Adresse bereits vergeben' },
          { status: 400 }
        )
      }
      
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
          { status: 400 }
        )
      }
      
      const hashedPassword = await hashPassword(password)
      
      const newUser = await db.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: 'GAST', // Basis-Systemrolle, Firmenrolle bestimmt Berechtigungen
        },
      })
      
      targetUserId = newUser.id
    } else if (!targetUserId && email) {
      // Existierenden Benutzer suchen
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
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
        { error: 'Benutzer-Daten erforderlich' },
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
    
    // Add user to company
    const newCompanyUser = await db.companyUser.create({
      data: {
        userId: targetUserId,
        companyId: id,
        role: requestedRole as CompanyRole,
        isDefault: true, // Erste Firma wird Default
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
    
    // Aktivitaetslog
    await db.activityLog.create({
      data: {
        userId: session.userId,
        companyId: id,
        action: 'CREATE',
        entity: 'CompanyUser',
        entityId: newCompanyUser.id,
        details: `Benutzer ${newCompanyUser.user.email} zur Firma hinzugefuegt (Rolle: ${requestedRole})`,
      },
    })
    
    return NextResponse.json({ companyUser: newCompanyUser })
  } catch (error) {
    console.error('Add company user error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Hinzufuegen des Benutzers' },
      { status: 500 }
    )
  }
}
