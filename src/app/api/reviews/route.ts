import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// ─── helpers ──────────────────────────────────────────────────────────────

function clampRating(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(1, Math.min(5, Math.round(v)));
}

function sanitize(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, max);
}

// ─── GET /api/reviews?revieweeId=... ──────────────────────────────────────
// Returns: { reviewee, aggregate, reviews[] }
// Public-ish: any logged-in user can read any reviewee's reviews.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const revieweeId = searchParams.get('revieweeId');
    if (!revieweeId) {
      return NextResponse.json({ error: 'revieweeId query parameter is required' }, { status: 400 });
    }

    // Load the reviewee (must exist; must be either an agent or a client)
    const reviewee = await db.user.findUnique({
      where: { id: revieweeId },
      select: {
        id: true, name: true, email: true, role: true, avatar: true,
        accountStatus: true,
      },
    });
    if (!reviewee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (reviewee.role !== 'agent' && reviewee.role !== 'client') {
      return NextResponse.json({ error: 'Reviews are only available for agents and call centers' }, { status: 400 });
    }

    // For call centers, surface the company name instead of the contact person's name
    let companyName: string | null = null;
    let industry: string | null = null;
    if (reviewee.role === 'client') {
      const client = await db.client.findUnique({
        where: { userId: reviewee.id },
        select: { companyName: true, industry: true },
      });
      companyName = client?.companyName || null;
      industry = client?.industry || null;
    }

    // For agents, surface country + a few skills (purely for display)
    let country: string | null = null;
    let skills: string[] = [];
    if (reviewee.role === 'agent') {
      const agent = await db.agent.findUnique({
        where: { userId: reviewee.id },
        select: { country: true, skills: true },
      });
      country = agent?.country || null;
      try { skills = JSON.parse(agent?.skills || '[]'); } catch { skills = []; }
    }

    // Fetch all reviews for this reviewee, newest first
    const rows = await db.review.findMany({
      where: { revieweeId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch reviewer info in one shot (resilient to deleted reviewers)
    const reviewerIds = Array.from(new Set(rows.map(r => r.reviewerId)));
    const reviewers = reviewerIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, name: true, role: true, avatar: true },
        })
      : [];
    const reviewerMap = Object.fromEntries(reviewers.map(u => [u.id, u]));

    // For call-center reviewers, also pull their company names so the review
    // card can show "TechCall Inc" instead of "Miguel Louiséma".
    const clientReviewerIds = reviewers.filter(r => r.role === 'client').map(r => r.id);
    let clientCompanyMap: Record<string, { companyName: string | null; industry: string | null }> = {};
    if (clientReviewerIds.length > 0) {
      const clientRows = await db.client.findMany({
        where: { userId: { in: clientReviewerIds } },
        select: { userId: true, companyName: true, industry: true },
      });
      clientCompanyMap = Object.fromEntries(clientRows.map(c => [c.userId, { companyName: c.companyName, industry: c.industry }]));
    }

    const reviews = rows.map(r => {
      const rv = reviewerMap[r.reviewerId];
      const cc = rv && rv.role === 'client' ? clientCompanyMap[rv.id] : null;
      return {
        id: r.id,
        reviewerId: r.reviewerId,
        revieweeId: r.revieweeId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        reviewer: rv ? {
          id: rv.id,
          name: rv.name,
          role: rv.role,
          avatar: rv.avatar,
          companyName: cc?.companyName || null,
        } : null,
      };
    });

    // Aggregate
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
    }));

    return NextResponse.json({
      reviewee: {
        id: reviewee.id,
        name: companyName || reviewee.name,
        role: reviewee.role,
        avatar: reviewee.avatar,
        email: reviewee.email,
        accountStatus: reviewee.accountStatus,
        // Pass-through enrichments (handy for the page header)
        companyName,
        industry,
        country,
        skills: skills.slice(0, 5),
      },
      aggregate: {
        avgRating,
        reviewCount,
        distribution,
      },
      reviews,
    });
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

// ─── POST /api/reviews  (create or update) ───────────────────────────────
// Body: { revieweeId, rating: 1..5, title?, comment }
// Rules:
//   • Auth required
//   • Only agents (role === 'agent') can review call centers (role === 'client')
//   • Only call centers (role === 'client') can review agents (role === 'agent')
//   • One review per (reviewer, reviewee) pair — enforced by @@unique; we upsert
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const revieweeId = sanitize(body.revieweeId, 100);
    const rating = clampRating(body.rating);
    const title = sanitize(body.title, 120);
    const comment = sanitize(body.comment, 4000);

    if (!revieweeId) return NextResponse.json({ error: 'revieweeId is required' }, { status: 400 });
    if (!comment) return NextResponse.json({ error: 'Please write a comment for your review' }, { status: 400 });
    if (comment.length < 10) return NextResponse.json({ error: 'Please write at least 10 characters' }, { status: 400 });
    if (revieweeId === auth.userId) return NextResponse.json({ error: 'You cannot review yourself' }, { status: 400 });

    // Load reviewer + reviewee in parallel
    const [reviewer, reviewee] = await Promise.all([
      db.user.findUnique({ where: { id: auth.userId }, select: { id: true, role: true, accountStatus: true } }),
      db.user.findUnique({ where: { id: revieweeId }, select: { id: true, role: true, accountStatus: true } }),
    ]);
    if (!reviewer) return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 });
    if (!reviewee) return NextResponse.json({ error: 'User to review not found' }, { status: 404 });

    // Cross-role rule: agent <-> client only
    const isAgentReviewingClient = reviewer.role === 'agent' && reviewee.role === 'client';
    const isClientReviewingAgent = reviewer.role === 'client' && reviewee.role === 'agent';
    if (!isAgentReviewingClient && !isClientReviewingAgent) {
      return NextResponse.json(
        { error: 'Reviews can only be left by agents for call centers, or by call centers for agents.' },
        { status: 403 },
      );
    }

    // Upsert (one review per reviewer-reviewee pair)
    const review = await db.review.upsert({
      where: {
        reviewerId_revieweeId: { reviewerId: auth.userId, revieweeId },
      },
      create: {
        reviewerId: auth.userId,
        revieweeId,
        rating,
        title: title || null,
        comment,
      },
      update: {
        rating,
        title: title || null,
        comment,
      },
    });

    return NextResponse.json({
      review: {
        id: review.id,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      },
      message: 'Review saved',
    });
  } catch (error) {
    console.error('POST /api/reviews error:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}
