import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const clientId = searchParams.get('clientId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (clientId) where.clientId = clientId;

    const placements = await db.placement.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        client: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = placements.map((p) => ({
      ...p,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/placements error:', error);
    return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, clientId, requestId, position, startDate, endDate, salary, commission, status } = body;

    if (!agentId || !clientId || !position) {
      return NextResponse.json({ error: 'agentId, clientId, and position are required' }, { status: 400 });
    }

    const placement = await db.placement.create({
      data: {
        agentId,
        clientId,
        requestId: requestId || null,
        position,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        salary: salary ?? null,
        commission: commission ?? null,
        status: status || 'Pending',
      },
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        client: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      ...placement,
      startDate: placement.startDate?.toISOString() || null,
      endDate: placement.endDate?.toISOString() || null,
      createdAt: placement.createdAt.toISOString(),
      updatedAt: placement.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/placements error:', error);
    return NextResponse.json({ error: 'Failed to create placement' }, { status: 500 });
  }
}