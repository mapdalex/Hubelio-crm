import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

/**
 * GET /api/worklogs
 * Worklogs abrufen - mit Rollenbasiertem Zugriff
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const projectId = searchParams.get('projectId');
    const month = searchParams.get('month'); // YYYY-MM
    const year = searchParams.get('year');
    const userId = searchParams.get('userId');

    // Build filter
    let filter: any = {};

    if (customerId) filter.customerId = customerId;
    if (projectId) filter.projectId = projectId;
    if (userId) filter.userId = userId;

    // Month/Year filtering
    if (month && year) {
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      filter.startTime = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      filter.startTime = { gte: startDate, lte: endDate };
    }

    // Rollenbasierter Zugriff
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      // Normale Mitarbeiter sehen nur ihre eigenen Logs
      filter.userId = session.user.id;
    }

    const worklogs = await db.worklog.findMany({
      where: filter,
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, color: true } },
        activity: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(worklogs);
  } catch (error: any) {
    console.error('Error fetching worklogs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worklogs
 * Neuen Worklog erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      projectId,
      activityId,
      startTime,
      endTime,
      duration,
      description,
    } = body;

    // Validation
    if (!customerId || !projectId || !activityId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const worklog = await db.worklog.create({
      data: {
        userId: session.user.id,
        customerId,
        projectId,
        activityId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: duration || Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
        description,
        companyId: session.user.companyId,
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(worklog, { status: 201 });
  } catch (error: any) {
    console.error('Error creating worklog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
