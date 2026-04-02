import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSessionCompany } from '@/lib/auth'
import { switchCompany } from '@/lib/multi-tenant'
import { getUserAccessibleModules, getUserModulePermissions } from '@/lib/module-manager'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { companyId } = await request.json()
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Firma ID erforderlich' },
        { status: 400 }
      )
    }
    
    // Switch to new company
    const companyContext = await switchCompany(session.userId, companyId)
    
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Kein Zugriff auf diese Firma' },
        { status: 403 }
      )
    }
    
    // Get accessible modules for new company
    const accessibleModules = await getUserAccessibleModules(
      session.userId,
      companyId
    )
    
    // Get module permissions for new company
    const modulePermissions = await getUserModulePermissions(
      session.userId,
      companyId
    )
    
    // Update session with new company context
    await updateSessionCompany(session.userId, {
      companyId: companyContext.company.id,
      companyName: companyContext.company.name,
      companyRole: companyContext.role,
      accessibleModules,
    })
    
    return NextResponse.json({
      company: {
        id: companyContext.company.id,
        name: companyContext.company.name,
        slug: companyContext.company.slug,
        logo: companyContext.company.logo,
      },
      companyRole: companyContext.role,
      accessibleModules,
      modulePermissions,
    })
  } catch (error) {
    console.error('Switch company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Wechseln der Firma' },
      { status: 500 }
    )
  }
}
