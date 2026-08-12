import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/admin/password-resets?status=pending|all
// Lists password reset requests for the admin to review. By default, only shows
// 'pending' requests. With ?status=all shows everything (for the audit history).
//
// For each request, includes the full user context (name, email, role, account
// status, joined date, ID verification status, application/placement counts) so
// the admin can confidently identify who they're dealing with before generating
// a reset link.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'pending';

    const where: Record<string, unknown> = {};
    if (statusFilter !== 'all') {
      where.status = statusFilter;
    }

    const requests = await db.passwordResetRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            accountStatus: true,
            createdAt: true,
            avatar: true,
            agent: {
              select: {
                id: true,
                idVerificationStatus: true,
                _count: {
                  select: {
                    jobApplications: true,
                    placements: { where: { status: 'active' } },
                  },
                },
              },
            },
          },
        },
        tokens: {
          select: {
            id: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
            createdBy: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const cleaned = requests.map(r => ({
      id: r.id,
      email: r.email,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() || null,
      resolvedBy: r.resolvedBy,  // just the admin user id (no relation join)
      user: r.user ? {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        role: r.user.role,
        isActive: r.user.isActive,
        accountStatus: r.user.accountStatus,
        avatar: r.user.avatar,
        joinedAt: r.user.createdAt.toISOString(),
        idVerificationStatus: r.user.agent?.idVerificationStatus || null,
        applicationCount: r.user.agent?._count.jobApplications || 0,
        activePlacementCount: r.user.agent?._count.placements || 0,
      } : null,
      hasActiveToken: r.tokens.some(t => !t.usedAt && t.expiresAt > new Date()),
      latestToken: r.tokens[0] ? {
        id: r.tokens[0].id,
        expiresAt: r.tokens[0].expiresAt.toISOString(),
        usedAt: r.tokens[0].usedAt?.toISOString() || null,
        createdAt: r.tokens[0].createdAt.toISOString(),
      } : null,
    }));

    return NextResponse.json({ requests: cleaned });
  } catch (error) {
    console.error('GET /api/admin/password-resets error:', error);
    return NextResponse.json({ error: 'Failed to fetch password reset requests' }, { status: 500 });
  }
}

// PATCH /api/admin/password-resets/[id] — used to dismiss a request without
// generating a token (e.g., if the admin determines it's spam or the user
// doesn't exist). Body: { status: 'dismissed' }
// The "generate a token" action is in a separate route file.
