import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

/**
 * POST /api/users/mark-paid
 *   Admin only. Body: { userId: string, paid: boolean }
 *
 * Toggles the subscription state of a user. When `paid=true`:
 *   - Agents:        paidUntil = now + 3 months (quarterly), amount = 1,000 HTG
 *   - Call centers:  paidUntil = now + 12 months (yearly),   amount = 3,000 HTG
 *   - Records the transaction as an APPROVED PaymentRequest for audit.
 *
 * When `paid=false`:
 *   - Sets paid=false, paidUntil=null, paymentTier=null (revokes access).
 *
 * Used by the admin "Mark Paid" button on AdminUsers and the "Approve"
 * button on PaymentTakerDashboard (which calls this with paid=true).
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const TIER_CONFIG = {
  agent: { months: 3, amount: 1000, tier: 'agent_quarterly', label: 'Agent Quarterly (3 months)' },
  client: { months: 12, amount: 3000, tier: 'client_yearly', label: 'Call Center Yearly (12 months)' },
} as const;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    // ROLE MERGE: payment_taker is treated as admin
    const effectiveRole = auth.role === 'payment_taker' ? 'admin' : auth.role;
    if (effectiveRole !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, paid } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (typeof paid !== 'boolean') return NextResponse.json({ error: 'paid (boolean) required' }, { status: 400 });

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Only agents and clients are billable. Admin / payment_taker / visitor are free.
    const cfg = (target.role === 'agent' || target.role === 'client') ? TIER_CONFIG[target.role as 'agent' | 'client'] : null;

    if (!paid) {
      const updated = await db.user.update({
        where: { id: userId },
        data: { paid: false, paidUntil: null, paymentTier: null },
      });
      return NextResponse.json({
        user: {
          id: updated.id,
          paid: updated.paid,
          paidUntil: updated.paidUntil ? updated.paidUntil.toISOString() : null,
          paymentTier: updated.paymentTier,
        },
      });
    }

    if (!cfg) {
      return NextResponse.json({ error: 'Only agents and call centers can be marked paid' }, { status: 400 });
    }

    const now = new Date();
    const until = addMonths(now, cfg.months);

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        paid: true,
        paidUntil: until,
        paymentTier: cfg.tier,
        // Ensure the account itself is also active (in case it was somehow pending)
        isActive: true,
        accountStatus: 'active',
      },
    });

    // Record an APPROVED PaymentRequest for audit trail
    try {
      await db.paymentRequest.create({
        data: {
          userId,
          role: target.role,
          feeType: cfg.tier,
          amount: cfg.amount,
          currency: 'HTG',
          status: 'approved',
          handledBy: auth.userId,
        },
      });
    } catch (prErr) {
      console.error('[mark-paid] Failed to create audit PaymentRequest:', prErr);
      // Non-fatal — the user is already marked paid.
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        paid: updated.paid,
        paidUntil: updated.paidUntil ? updated.paidUntil.toISOString() : null,
        paymentTier: updated.paymentTier,
      },
      tier: cfg.tier,
      amount: cfg.amount,
      currency: 'HTG',
      paidUntil: until.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/users/mark-paid error:', error);
    return NextResponse.json({ error: 'Failed to update paid status' }, { status: 500 });
  }
}
