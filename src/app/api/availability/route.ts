import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    const slots = await db.availabilitySlot.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const parsed = slots.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/availability error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, date, startTime, endTime, isAvailable } = body;

    if (!agentId || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slot = await db.availabilitySlot.create({
      data: {
        agentId,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        isAvailable: isAvailable !== false,
      },
    });

    return NextResponse.json({
      ...slot,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/availability error:', error);
    return NextResponse.json({ error: 'Failed to create availability slot' }, { status: 500 });
  }
}