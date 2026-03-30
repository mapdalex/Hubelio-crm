import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCompany, generateUniqueSlug, getUserCompanies } from '@/lib/multi-tenant'

// GET /api/companies - Get user's companies
export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const companies = await getUserCompanies(session.userId)
    
    return NextResponse.json({
      companies: companies.map((cu) => ({
        id: cu.company.id,
        name: cu.company.name,
        slug: cu.company.slug,
        logo: cu.company.logo,
        email: cu.company.email,
        phone: cu.company.phone,
        address: cu.company.address,
        website: cu.company.website,
        role: cu.role,
        isDefault: cu.isDefault,
        joinedAt: cu.joinedAt,
      })),
    })
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Firmen' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Create new company
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }
    
    const { name, email, phone, address, website } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Firmenname erforderlich' },
        { status: 400 }
      )
    }
    
    // Generate unique slug
    const slug = await generateUniqueSlug(name)
    
    // Create company
    const company = await createCompany(session.userId, {
      name,
      slug,
      email,
      phone,
      address,
      website,
    })
    
    return NextResponse.json({ company })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Firma' },
      { status: 500 }
    )
  }
}
