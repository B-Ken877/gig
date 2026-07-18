import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (id) {
      // Use findUnique + separate user lookup to be resilient to orphan rows
      // (Clients whose User was hard-deleted bypassing Prisma's cascade).
      const client = await db.client.findUnique({ where: { id } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      let user: { id: string; name: string; email: string; role: string; phone: string | null; avatar: string | null; accountStatus: string } | null = null;
      if (client.userId) {
        user = await db.user.findUnique({
          where: { id: client.userId },
          select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true },
        });
      }
      return NextResponse.json({ client: { ...client, user, phone: client.phone || user?.phone || null } });
    }

    if (userId) {
      // Find by userId — used by the profile form to load the current user's company
      const client = await db.client.findUnique({ where: { userId } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      let user: { id: string; name: string; email: string; role: string; phone: string | null; avatar: string | null; accountStatus: string } | null = null;
      if (client.userId) {
        user = await db.user.findUnique({
          where: { id: client.userId },
          select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true },
        });
      }
      return NextResponse.json({ client: { ...client, user, phone: client.phone || user?.phone || null } });
    }

    // List all clients — fetch users in a separate query to be resilient to orphans.
    const clients = await db.client.findMany({ orderBy: { createdAt: 'desc' } });
    const userIds = clients.map(c => c.userId).filter(Boolean) as string[];
    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return NextResponse.json({
      clients: clients.map(c => ({
        ...c,
        user: c.userId ? userMap[c.userId] || null : null,
      })),
    });
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
