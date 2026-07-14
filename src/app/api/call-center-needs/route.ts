import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

function parseRequirements(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.flatMap(item =>
        String(item).split(',').map(s => s.trim()).filter(Boolean)
      );
    }
    return String(parsed).split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
}



export async function GET(req: NextRequest) {
  try {
    const needs = await db.callCenterNeed.findMany({
      where: { isActive: true },
      include: { client: { select: { companyName: true, industry: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      needs: needs.map(n => ({
        ...n,
        requirements: parseRequirements(n.requirements),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const { userId } = auth;
    const client = await db.client.findUnique({ where: { userId } });
    if (!client) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });

    const body = await req.json();
    const { title, description, requirements } = body;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const need = await db.callCenterNeed.create({
      data: {
        clientId: client.id,
        title,
        description: description || '',
        requirements: JSON.stringify(requirements || []),
      },
    });
    return NextResponse.json({
      need: {
        ...need,
        requirements: parseRequirements(need.requirements),
        createdAt: need.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client' && auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.callCenterNeed.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}


