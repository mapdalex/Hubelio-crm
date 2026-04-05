import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const worklog = await prisma.worklog.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        customer: true,
        project: true,
        activity: true,
      },
    });

    if (!worklog) {
      return NextResponse.json({ error: 'Worklog not found' }, { status: 404 });
    }

    // Check permissions - user can only see own logs or admin can see all
    if (
      session.user.id !== worklog.userId &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'SUPERADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(worklog);
  } catch (error: any) {
    console.error('Error fetching worklog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const worklog = await prisma.worklog.findUnique({
      where: { id: params.id },
    });

    if (!worklog) {
      return NextResponse.json({ error: 'Worklog not found' }, { status: 404 });
    }

    // Only creator or admin can update
    if (
      session.user.id !== worklog.userId &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'SUPERADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const updated = await prisma.worklog.update({
      where: { id: params.id },
      data: {
        ...(customerId && { customerId }),
        ...(projectId && { projectId }),
        ...(activityId && { activityId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(duration !== undefined && { duration }),
        ...(description !== undefined && { description }),
      },
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating worklog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const worklog = await prisma.worklog.findUnique({
      where: { id: params.id },
    });

    if (!worklog) {
      return NextResponse.json({ error: 'Worklog not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    if (
      session.user.id !== worklog.userId &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'SUPERADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.worklog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting worklog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
