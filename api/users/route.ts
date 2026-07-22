import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    // ROLE MERGE: payment_taker is treated as admin
    const effectiveRole = auth.role === 'payment_taker' ? 'admin' : auth.role;
    if (effectiveRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const users = await db.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        avatar: true, isActive: true, accountStatus: true, createdAt: true,
        // Verification + Gig Score (premium badges)
        verificationTiers: true, verifiedAt: true, verifiedBy: true,
        gigScore: true, gigScoreUpdatedAt: true,
        // Subscription / payment gating
        paid: true, paidUntil: true, paymentTier: true,
        // Bring the client's companyName through the relation so the admin table
        // can show "TechCall Inc" instead of the contact person's personal name.
        client: { select: { companyName: true, industry: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone,
        avatar: u.avatar, isActive: u.isActive, accountStatus: u.accountStatus,
        createdAt: u.createdAt.toISOString(),
        // Flatten for the client
        companyName: u.client?.companyName || null,
        industry: u.client?.industry || null,
        // Verification — parse JSON string into array for the client
        verificationTiers: (() => { try { const v = JSON.parse(u.verificationTiers || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } })(),
        verifiedAt: u.verifiedAt ? u.verifiedAt.toISOString() : null,
        verifiedBy: u.verifiedBy,
        gigScore: u.gigScore || 0,
        // Subscription
        paid: u.paid,
        paidUntil: u.paidUntil ? u.paidUntil.toISOString() : null,
        paymentTier: u.paymentTier,
      })),
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, accountStatus: user.accountStatus } });
  } catch (error) {
    console.error('PATCH /api/users error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
