import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const requests = await db.paymentRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, phone: true } },
        handledByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ paymentRequests: requests.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })) });
  } catch (error) {
    console.error('GET /api/payment-requests error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH - approve or reject a payment request
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'payment_taker' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Payment taker or admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    if (!['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const pr = await db.paymentRequest.findUnique({ where: { id } });
    if (!pr) return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });

    const updated = await db.paymentRequest.update({
      where: { id },
      data: { status, handledBy: auth.userId },
    });

    // If approved, activate the user account
    if (status === 'approved') {
      await db.user.update({
        where: { id: pr.userId },
        data: { isActive: true, accountStatus: 'active' },
      });
    }

    return NextResponse.json({ paymentRequest: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    console.error('PATCH /api/payment-requests error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
