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

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/messages/search-users error:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
