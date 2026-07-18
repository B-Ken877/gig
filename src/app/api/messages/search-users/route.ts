import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    // Don't filter by isActive - payment taker needs to message pending users
    const where: Record<string, unknown> = { id: { not: userId } };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { role: { contains: q } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, avatar: true, accountStatus: true },
      orderBy: { name: 'asc' },
      take: 100,
    });

    // Fetch company names + industry for all client-role users in one query
    // so the UI can display the call center name instead of the personal name.
    const clientUserIds = users.filter(u => u.role === 'client').map(u => u.id);
    const clients = clientUserIds.length > 0
      ? await db.client.findMany({
          where: { userId: { in: clientUserIds } },
          select: { userId: true, companyName: true, industry: true },
        })
      : [];
    const clientMap = Object.fromEntries(clients.map(c => [c.userId, c]));

    // Also fetch the current user's own client profile so the UI knows their
    // company name (used in the "start chat" dialog when they're a client).
    const result = users.map(u => {
      const client = u.role === 'client' ? clientMap[u.id] : undefined;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        accountStatus: u.accountStatus,
        // For clients, expose the company name so the UI can show "Company Name (role)".
        companyName: client?.companyName || null,
        industry: client?.industry || null,
        // Convenience: the display name to use everywhere in the UI.
        displayName: u.role === 'client' && client?.companyName ? client.companyName : u.name,
      };
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('GET /api/messages/search-users error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
