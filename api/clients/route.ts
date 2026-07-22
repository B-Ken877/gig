import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const client = await db.client.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
      });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      return NextResponse.json({ client });
    }

    const clients = await db.client.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    const client = await db.client.update({ where: { id }, data });
    return NextResponse.json({ client });
  } catch (error) {
    console.error('PATCH /api/clients error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
