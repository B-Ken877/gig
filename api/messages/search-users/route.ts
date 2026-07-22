import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    // ─── Role-based visibility rules ────────────────────────────────────
    //   - Agents can ONLY see other agents (no call centers in their list).
    //     They reach call centers by applying to a job — the conversation
    //     is created implicitly. "New message" lets them talk to peers.
    //   - Call centers can see admins + agents + other call centers.
    //   - Admin can see everyone (including payment_taker for legacy rows).
    let roleFilter: string[] | undefined;
    if (role === 'agent') {
      roleFilter = ['agent'];
    } else if (role === 'client') {
      roleFilter = ['admin', 'agent', 'client', 'payment_taker'];
    } else if (role === 'admin' || role === 'payment_taker') {
      roleFilter = undefined; // see everyone
    } else {
      roleFilter = undefined;
    }

    // Don't filter by isActive - payment taker needs to message pending users
    const where: Record<string, unknown> = { id: { not: userId } };
    if (roleFilter) {
      where.role = { in: roleFilter };
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { role: { contains: q } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, avatar: true, accountStatus: true, verificationTiers: true, verifiedAt: true },
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
      // Parse verificationTiers JSON string -> string[]
      let tiers: string[] = [];
      try {
        const parsed = JSON.parse((u as any).verificationTiers || '[]');
        if (Array.isArray(parsed)) tiers = parsed.filter((t: unknown) => typeof t === 'string');
      } catch { /* ignore */ }
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
        // Verification — needed so the new-conversation dialog can show the badge seal
        verificationTiers: tiers,
        verifiedAt: (u as any).verifiedAt ? (u as any).verifiedAt.toISOString() : null,
      };
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('GET /api/messages/search-users error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
