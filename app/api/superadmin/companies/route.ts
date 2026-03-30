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
            role: 'ADMIN', // Company admins get ADMIN role
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
      
      // Subscribe to CORE module
      const coreModule = await tx.module.findUnique({
        where: { moduleId: 'CORE' },
      })
      
      if (coreModule) {
        await tx.subscription.create({
          data: {
            companyId: company.id,
            moduleId: coreModule.id,
            tier: 'FREE',
            status: 'ACTIVE',
          },
        })
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
