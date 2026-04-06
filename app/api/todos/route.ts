import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany, canEditInCompany } from '@/lib/auth'

/**
 * GET /api/todos
 * Todos abrufen - mit Filtern nach Monat und Status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canViewInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM format oder "all"
    const status = searchParams.get('status') // "all", "open", "completed"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {}

    // Multi-tenant filter
    if (session!.role !== 'SUPERADMIN' && session!.companyId) {
      filter.companyId = session!.companyId
    }

    // Status filter
    if (status === 'open') {
      filter.isCompleted = false
    } else if (status === 'completed') {
      filter.isCompleted = true
    }

    // Month filtering (YYYY-MM format)
    if (month && month !== 'all') {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)
      filter.dueDate = { gte: startDate, lte: endDate }
    }

    // Rollenbasierter Zugriff:
    // Admin und Manager sehen alle Todos der Firma
    // User sehen nur ihre eigenen (zugewiesen oder erstellt)
    const canViewAll = ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(session!.role)
    if (!canViewAll) {
      filter.OR = [
        { userId: session!.userId },
        { createdById: session!.userId }
      ]
    }

    const todos = await db.todo.findMany({
      where: filter,
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { isCompleted: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(todos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

/**
 * POST /api/todos
 * Neues Todo erstellen
 * - assignToAll: true => Erstellt fuer jeden User der Firma ein Todo
 * - assignedUserId: string => Erstellt fuer diesen spezifischen User
 * - sonst => Erstellt fuer den aktuellen User
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!canEditInCompany(session)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      dueDate,
      priority = 'medium',
      assignToAll,
      assignedUserId,
    } = body

    // Validation
    if (!title) {
      return NextResponse.json(
        { error: 'Titel ist erforderlich' },
        { status: 400 }
      )
    }

    // Falls "alle User" => Fuer jeden User der Firma ein Todo erstellen
    if (assignToAll && session!.companyId) {
      const companyUsers = await db.companyUser.findMany({
        where: { 
          companyId: session!.companyId,
          user: { isActive: true }
        },
        select: { userId: true },
      })

      const todosData = companyUsers.map(cu => ({
        userId: cu.userId,
        createdById: session!.userId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        companyId: session!.companyId,
      }))

      const created = await db.todo.createMany({
        data: todosData,
      })

      return NextResponse.json({ 
        success: true, 
        count: created.count,
        message: `${created.count} Todos erstellt` 
      }, { status: 201 })
    }

    // Einzelnes Todo erstellen
    const targetUserId = assignedUserId || session!.userId

    const todo = await db.todo.create({
      data: {
        userId: targetUserId,
        createdById: session!.userId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        companyId: session!.companyId,
      },
      include: {
        user: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(todo, { status: 201 })
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
