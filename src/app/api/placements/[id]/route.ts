import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const placement = await db.placement.findUnique({
      where: { id },
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
        request: true,
      },
    });

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...placement,
      startDate: placement.startDate?.toISOString() || null,
      endDate: placement.endDate?.toISOString() || null,
      createdAt: placement.createdAt.toISOString(),
      updatedAt: placement.updatedAt.toISOString(),
      request: placement.request ? {
        ...placement.request,
        languages: JSON.parse(placement.request.languages || '[]'),
        startDate: placement.request.startDate?.toISOString() || null,
        createdAt: placement.request.createdAt.toISOString(),
        updatedAt: placement.request.updatedAt.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error('GET /api/placements/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch placement' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.placement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.position !== undefined) data.position = body.position;
    if (body.status !== undefined) data.status = body.status;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.salary !== undefined) data.salary = body.salary || null;
    if (body.commission !== undefined) data.commission = body.commission || null;
    if (body.requestId !== undefined) data.requestId = body.requestId || null;

    const placement = await db.placement.update({
      where: { id },
      data,
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
    });
  } catch (error) {
    console.error('PUT /api/placements/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update placement' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.placement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    await db.placement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/placements/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete placement' }, { status: 500 });
  }
}