import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, canViewInCompany } from '@/lib/auth'
import { addDays, startOfMonth, endOfMonth } from 'date-fns'
import type { ModuleId } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const companyId = session.companyId
    const accessibleModules = session.accessibleModules || ['CORE']
    const isEmployee = canViewInCompany(session)

    if (!isEmployee) {
      return NextResponse.json({ 
        modules: {},
        accessibleModules: ['CORE']
      })
    }

    const now = new Date()
    const thirtyDaysFromNow = addDays(now, 30)
    const monthStart = startOfMonth(now)
    const nextMonthEnd = endOfMonth(addDays(now, 30))

    const stats: Record<string, unknown> = {}

    // CORE Module Stats (always accessible)
    if (accessibleModules.includes('CORE' as ModuleId)) {
      const whereCompany = companyId ? { companyId } : {}
      
      const [customerCount, recentCustomers] = await Promise.all([
        db.customer.count({ 
          where: { isActive: true, ...whereCompany } 
        }),
        db.customer.findMany({
          where: { isActive: true, ...whereCompany },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            customerNumber: true,
            createdAt: true,
          }
        })
      ])

      stats.CORE = {
        customerCount,
        recentCustomers,
      }
    }

    // IT Module Stats
    if (accessibleModules.includes('IT' as ModuleId)) {
      const [
        computerCount,
        activeComputerCount,
        domainCount,
        domainsExpiringSoon,
        warrantyExpiringSoon,
      ] = await Promise.all([
        db.computer.count(),
        db.computer.count({ where: { isActive: true } }),
        db.domain.count({ where: { status: 'active' } }),
        db.domain.count({
          where: {
            expiryDate: { gte: now, lte: thirtyDaysFromNow },
            status: 'active',
          },
        }),
        db.computer.count({
          where: {
            warrantyUntil: { gte: now, lte: thirtyDaysFromNow },
            isActive: true,
          },
        }),
      ])

      stats.IT = {
        computerCount,
        activeComputerCount,
        domainCount,
        domainsExpiringSoon,
        warrantyExpiringSoon,
      }
    }

    // SALES Module Stats
    if (accessibleModules.includes('SALES' as ModuleId)) {
      const [
        serviceCount,
        activeServiceCount,
        servicesRenewalSoon,
      ] = await Promise.all([
        db.service.count(),
        db.service.count({ where: { status: 'active' } }),
        db.service.count({
          where: {
            renewalDate: { gte: monthStart, lte: nextMonthEnd },
            status: 'active',
          },
        }),
      ])

      // Calculate revenue (simple sum of active service prices)
      const revenueData = await db.service.aggregate({
        where: { status: 'active' },
        _sum: { sellPrice: true },
      })

      stats.SALES = {
        serviceCount,
        activeServiceCount,
        servicesRenewalSoon,
        monthlyRevenue: revenueData._sum.sellPrice?.toNumber() || 0,
      }
    }

    // MESSAGE Module Stats (Tickets)
    if (accessibleModules.includes('MESSAGE' as ModuleId)) {
      const whereTicketCompany = companyId ? { companyId } : {}
      
      const [
        openTickets,
        inProgressTickets,
        urgentTickets,
        resolvedThisMonth,
      ] = await Promise.all([
        db.ticket.count({ 
          where: { status: 'OPEN', ...whereTicketCompany } 
        }),
        db.ticket.count({ 
          where: { status: 'IN_PROGRESS', ...whereTicketCompany } 
        }),
        db.ticket.count({ 
          where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] }, ...whereTicketCompany } 
        }),
        db.ticket.count({
          where: {
            status: 'RESOLVED',
            closedAt: { gte: monthStart },
            ...whereTicketCompany
          },
        }),
      ])

      stats.MESSAGE = {
        openTickets,
        inProgressTickets,
        urgentTickets,
        resolvedThisMonth,
        totalActive: openTickets + inProgressTickets,
      }
    }

    // SOCIALS Module Stats (placeholder - no real data yet)
    if (accessibleModules.includes('SOCIALS' as ModuleId)) {
      stats.SOCIALS = {
        connectedAccounts: 0,
        scheduledPosts: 0,
        publishedThisMonth: 0,
        engagement: 0,
      }
    }

    // CAMPAIGNS Module Stats (placeholder - no real data yet)
    if (accessibleModules.includes('CAMPAIGNS' as ModuleId)) {
      stats.CAMPAIGNS = {
        activeCampaigns: 0,
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
      }
    }

    // RENT Module Stats
    if (accessibleModules.includes('RENT' as ModuleId)) {
      const whereRent = companyId ? { companyId } : {}

      const [totalItems, activeBookings, pendingBookingsCount] = await Promise.all([
        db.rentalItem.count({ where: { isActive: true, ...whereRent } }),
        db.rentalBooking.count({
          where: {
            startDate: { lte: now },
            endDate: { gte: now },
            status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
            ...whereRent,
          },
        }),
        db.rentalBooking.count({
          where: { 
            status: 'PENDING',
            OR: [
              { startDate: { gt: now } },
              { endDate: { lt: now } },
            ],
            ...whereRent,
          },
        }),
      ])

      stats.RENT = {
        totalItems,
        availableItems: Math.max(0, totalItems - activeBookings),
        rentedItems: activeBookings,
        pendingBookings: pendingBookingsCount,
      }
    }

    // ANALYTICS Module Stats (placeholder - aggregate from other modules)
    if (accessibleModules.includes('ANALYTICS' as ModuleId)) {
      stats.ANALYTICS = {
        totalCustomers: stats.CORE ? (stats.CORE as { customerCount: number }).customerCount : 0,
        totalRevenue: stats.SALES ? (stats.SALES as { monthlyRevenue: number }).monthlyRevenue : 0,
        openTickets: stats.MESSAGE ? (stats.MESSAGE as { totalActive: number }).totalActive : 0,
        conversionRate: 0,
      }
    }

    return NextResponse.json({
      modules: stats,
      accessibleModules,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
