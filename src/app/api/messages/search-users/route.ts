import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/messages/search-users?q=...
// Search for users to start a conversation with. Admin can search everyone;
// agents can only search admins (so they can message the support team).
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const where: Record<string, unknown> = {
      id: { not: auth.userId },
      isActive: true,
    };

    if (auth.role === 'admin') {
      where.role = { in: ['agent', 'admin', 'payment_taker'] };
    } else {
      where.role = { in: ['admin', 'payment_taker'] };
    }

    if (q) {
      where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, avatar: true },
      take: 20,
    });

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar,
      })),
    });
  } catch (error) {
    console.error('GET /api/messages/search-users error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
