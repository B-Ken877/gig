import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/reviews/search?q=...
// Searches both agents and call centers by name (case-insensitive, contains).
// Returns up to 20 hits, each with aggregate rating info.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    if (q.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // Parallel: search agent users + client users.
    // We use the User table for both, then enrich with Agent / Client data.
    const [agentUsers, clientUsers] = await Promise.all([
      db.user.findMany({
        where: {
          role: 'agent',
          accountStatus: 'active',
          name: { contains: q },
        },
        select: {
          id: true, name: true, avatar: true,
          agent: { select: { country: true, skills: true } },
        },
        take: 20,
        orderBy: { name: 'asc' },
      }),
      db.user.findMany({
        where: {
          role: 'client',
          accountStatus: 'active',
          OR: [
            { name: { contains: q } },
            { client: { companyName: { contains: q } } },
          ],
        },
        select: {
          id: true, name: true, avatar: true,
          client: { select: { companyName: true, industry: true } },
        },
        take: 20,
        orderBy: { name: 'asc' },
      }),
    ]);

    const revieweeIds = [...agentUsers.map(u => u.id), ...clientUsers.map(u => u.id)];

    // Aggregate review stats in one query per user set
    const aggRows = revieweeIds.length > 0
      ? await db.review.groupBy({
          by: ['revieweeId'],
          where: { revieweeId: { in: revieweeIds } },
          _count: { rating: true },
          _avg: { rating: true },
        })
      : [];
    const aggMap: Record<string, { count: number; avg: number }> = {};
    for (const a of aggRows) {
      aggMap[a.revieweeId] = {
        count: a._count.rating,
        avg: a._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0,
      };
    }

    const agentResults = agentUsers.map(u => {
      const agg = aggMap[u.id];
      let skills: string[] = [];
      try { skills = JSON.parse(u.agent?.skills || '[]'); } catch { skills = []; }
      return {
        id: u.id,
        name: u.name,
        role: 'agent' as const,
        avatar: u.avatar,
        country: u.agent?.country || null,
        skills: skills.slice(0, 4),
        avgRating: agg?.avg || null,
        reviewCount: agg?.count || 0,
      };
    });

    const clientResults = clientUsers.map(u => ({
      id: u.id,
      name: u.client?.companyName || u.name,
      role: 'client' as const,
      avatar: u.avatar,
      industry: u.client?.industry || null,
      avgRating: aggMap[u.id]?.avg || null,
      reviewCount: aggMap[u.id]?.count || 0,
    }));

    // Merge and sort: users with reviews first, then alphabetical
    const results = [...agentResults, ...clientResults].sort((a, b) => {
      if ((b.reviewCount || 0) !== (a.reviewCount || 0)) {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      return a.name.localeCompare(b.name);
    }).slice(0, 20);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('GET /api/reviews/search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
