import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyContext, getUserCompanies } from '@/lib/multi-tenant'
import { getUserAccessibleModules } from '@/lib/module-manager'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }
    
    // Get user's companies
    const companiesData = await getUserCompanies(session.userId)
    const companies = companiesData.map((cu) => ({
      company: {
        id: cu.company.id,
        name: cu.company.name,
        slug: cu.company.slug,
        logo: cu.company.logo,
      },
      role: cu.role,
      isDefault: cu.isDefault,
    }))
    
    // Get current company context
    let company = null
    let companyRole = null
    let accessibleModules = ['CORE'] as string[]
    
    if (session.companyId) {
      const companyContext = await getCompanyContext(session.userId, session.companyId)
      if (companyContext) {
        company = {
          id: companyContext.company.id,
          name: companyContext.company.name,
          slug: companyContext.company.slug,
          logo: companyContext.company.logo,
        }
        companyRole = companyContext.role
        accessibleModules = await getUserAccessibleModules(
          session.userId,
          companyContext.company.id
        )
      }
    } else if (companies.length > 0) {
      // Auto-select default or first company
      const defaultCompany = companies.find((c) => c.isDefault) || companies[0]
      const companyContext = await getCompanyContext(session.userId, defaultCompany.company.id)
      if (companyContext) {
        company = {
          id: companyContext.company.id,
          name: companyContext.company.name,
          slug: companyContext.company.slug,
          logo: companyContext.company.logo,
        }
        companyRole = companyContext.role
        accessibleModules = await getUserAccessibleModules(
          session.userId,
          companyContext.company.id
        )
      }
    }
    
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
      company,
      companyRole,
      companies,
      accessibleModules,
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
