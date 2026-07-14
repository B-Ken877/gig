import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const slot = await db.availabilitySlot.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...slot,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/availability/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability slot' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.availabilitySlot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.date !== undefined) data.date = body.date;
    if (body.startTime !== undefined) data.startTime = body.startTime || null;
    if (body.endTime !== undefined) data.endTime = body.endTime || null;
    if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);

    const slot = await db.availabilitySlot.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...slot,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/availability/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update availability slot' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.availabilitySlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/availability/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete availability slot' }, { status: 500 });
  }
}