import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyModules } from '@/lib/module-manager'
import { getCurrentCompanyId } from '@/lib/multi-tenant'

// GET /api/modules - Get all modules with subscription status
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
      // Return all modules without subscription info
      const modules = await db.module.findMany({
        orderBy: { sortOrder: 'asc' },
      })
      
      return NextResponse.json({
        modules: modules.map((m) => ({
          ...m,
          isSubscribed: m.moduleId === 'CORE',
        })),
      })
    }
    
    const modules = await getCompanyModules(companyId)
    
    return NextResponse.json({ modules })
  } catch (error) {
    console.error('Get modules error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Module' },
      { status: 500 }
    )
  }
}
