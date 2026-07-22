import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    // Helper: strip phone from a client record + nested user unless admin.
    // The owner exception ONLY applies to the ?userId= path (loading your
    // own profile for editing). In all other contexts (list, ?id=), only
    // admin sees phone.
    const stripPhone = (clientRecord: any, allowOwner: boolean) => {
      const isOwner = allowOwner && !!clientRecord.userId && auth.userId === clientRecord.userId;
      const canSeePhone = isAdmin || isOwner;
      return {
        ...clientRecord,
        user: clientRecord.user
          ? { ...clientRecord.user, phone: canSeePhone ? clientRecord.user.phone : undefined }
          : null,
        phone: canSeePhone ? (clientRecord.phone || clientRecord.user?.phone || null) : undefined,
      };
    };

    if (id) {
      const client = await db.client.findUnique({ where: { id } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      let user: any = null;
      if (client.userId) {
        user = await db.user.findUnique({
          where: { id: client.userId },
          select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true },
        });
      }
      return NextResponse.json({ client: stripPhone({ ...client, user }, false) });
    }

    if (userId) {
      // Find by userId — used by the profile form to load the current user's company.
      // Owner exception applies here (they need their phone for editing).
      const client = await db.client.findUnique({ where: { userId } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      let user: any = null;
      if (client.userId) {
        user = await db.user.findUnique({
          where: { id: client.userId },
          select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true },
        });
      }
      return NextResponse.json({ client: stripPhone({ ...client, user }, true) });
    }

    // List all clients — strip phone for all non-admin callers (no owner
    // exception in list view; you're browsing, not editing).
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
      clients: clients.map(c => stripPhone({ ...c, user: c.userId ? userMap[c.userId] || null : null }, false)),
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
