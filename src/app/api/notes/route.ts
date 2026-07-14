import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const clientId = searchParams.get('clientId');
    const placementId = searchParams.get('placementId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (clientId) where.clientId = clientId;
    if (placementId) where.placementId = placementId;

    const notes = await db.internalNote.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const parsed = notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, clientId, placementId, type, content } = body;

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    const note = await db.internalNote.create({
      data: {
        agentId: agentId || null,
        clientId: clientId || null,
        placementId: placementId || null,
        authorId: 'system',
        type,
        content,
      },
    });

    return NextResponse.json({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}