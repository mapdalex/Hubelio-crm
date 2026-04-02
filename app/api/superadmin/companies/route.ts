import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword, isSuperAdmin } from '@/lib/auth'
import { generateUniqueSlug } from '@/lib/multi-tenant'

// Maximale Anzahl von Ownern pro Firma
const MAX_OWNERS_PER_COMPANY = 2

// GET /api/superadmin/companies - Get all companies (Superadmin only)
export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const companies = await db.company.findMany({
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
        },
        _count: {
          select: {
            customers: true,
            tickets: true,
            companyUsers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Firmen' },
      { status: 500 }
    )
  }
}

// Plan-Konfiguration: Wie viele Module sind im Plan inklusive (neben CORE)
const PLAN_INCLUDED_MODULES: Record<string, number> = {
  FREE: 0,      // Nur CORE
  STARTER: 1,   // CORE + 1 Modul
  PRO: 2,       // CORE + 2 Module
  ENTERPRISE: 999, // CORE + alle Module
}

// POST /api/superadmin/companies - Create company with admin (Superadmin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Nur Superadmin berechtigt' },
        { status: 403 }
      )
    }
    
    const { 
      companyName, 
      companyEmail, 
      companyPhone, 
      companyAddress,
      companyWebsite,
      // Admin user data
      adminName,
      adminEmail,
      adminPassword,
      createNewUser = true, // If false, use existing user by email
      // Plan selection
      plan = 'FREE', // FREE, STARTER, PRO, ENTERPRISE
      includedModules = [], // Module IDs die im Plan inklusive sind (z.B. ['MESSAGE', 'SALES'])
    } = await request.json()
    
    if (!companyName) {
      return NextResponse.json(
        { error: 'Firmenname erforderlich' },
        { status: 400 }
      )
    }
    
    if (createNewUser && (!adminName || !adminEmail || !adminPassword)) {
      return NextResponse.json(
        { error: 'Admin-Daten erforderlich (Name, E-Mail, Passwort)' },
        { status: 400 }
      )
    }
    
    if (!createNewUser && !adminEmail) {
      return NextResponse.json(
        { error: 'E-Mail des existierenden Benutzers erforderlich' },
        { status: 400 }
      )
    }
    
    const result = await db.$transaction(async (tx) => {
      // Create or find admin user
      let adminUser
      
      if (createNewUser) {
        // Check if email already exists
        const existingUser = await tx.user.findUnique({
          where: { email: adminEmail.toLowerCase() },
        })
        
        if (existingUser) {
          throw new Error('E-Mail bereits vergeben')
        }
        
        const hashedPassword = await hashPassword(adminPassword)
        
        adminUser = await tx.user.create({
          data: {
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            name: adminName,
            role: 'ADMIN', // Firmen-Admin - CompanyRole OWNER bestimmt Berechtigungen innerhalb der Firma
          },
        })
      } else {
        // Find existing user
        adminUser = await tx.user.findUnique({
          where: { email: adminEmail.toLowerCase() },
        })
        
        if (!adminUser) {
          throw new Error('Benutzer nicht gefunden')
        }
      }
      
      // Generate unique slug
      const slug = await generateUniqueSlug(companyName)
      
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          email: companyEmail || null,
          phone: companyPhone || null,
          address: companyAddress || null,
          website: companyWebsite || null,
        },
      })
      
      // Add admin user as OWNER of the company
      await tx.companyUser.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
          role: 'OWNER',
          isDefault: true,
        },
      })
      
      // Subscribe to CORE module (always included)
      const coreModule = await tx.module.findUnique({
        where: { moduleId: 'CORE' },
      })
      
      if (coreModule) {
        await tx.subscription.create({
          data: {
            companyId: company.id,
            moduleId: coreModule.id,
            tier: plan as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE',
            status: 'ACTIVE',
          },
        })
      }
      
      // Subscribe to included modules based on plan
      const maxIncludedModules = PLAN_INCLUDED_MODULES[plan] || 0
      const modulesToInclude = (includedModules as string[]).slice(0, maxIncludedModules)
      
      if (modulesToInclude.length > 0) {
        // Find all requested modules
        const modulesData = await tx.module.findMany({
          where: {
            moduleId: {
              in: modulesToInclude as any[],
            },
          },
        })
        
        // Create subscriptions for each included module
        for (const mod of modulesData) {
          await tx.subscription.create({
            data: {
              companyId: company.id,
              moduleId: mod.id,
              tier: plan as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE',
              status: 'ACTIVE',
            },
          })
        }
      }
      
      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          companyId: company.id,
          action: 'CREATE',
          entity: 'Company',
          entityId: company.id,
          details: `Firma ${companyName} mit Admin ${adminUser.email} erstellt`,
        },
      })
      
      return { company, adminUser }
    })
    
    return NextResponse.json({
      success: true,
      company: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
      },
      admin: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      },
    })
  } catch (error) {
    console.error('Create company error:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
