import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        createdAt.lte = new Date(endDate);
      }
      where.createdAt = createdAt;
    }

    const logs = await db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const parsedLogs = logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({ logs: parsedLogs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}