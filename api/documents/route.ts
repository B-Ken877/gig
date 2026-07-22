import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    const documents = await db.document.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const parsed = documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, type, fileName, fileUrl } = body;

    if (!agentId || !type || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check version
    const existing = await db.document.findMany({
      where: { agentId, type },
      orderBy: { version: 'desc' },
      take: 1,
    });
    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    const doc = await db.document.create({
      data: {
        agentId,
        type,
        fileName,
        fileUrl: fileUrl || '',
        version,
      },
    });

    return NextResponse.json({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}