import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

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
        user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, verificationTiers: true, verifiedAt: true } },
        handledByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      paymentRequests: requests.map(r => {
        // Parse verificationTiers JSON string -> string[]
        let userTiers: string[] = [];
        try {
          const parsed = JSON.parse((r.user as any)?.verificationTiers || '[]');
          if (Array.isArray(parsed)) userTiers = parsed.filter((t: unknown) => typeof t === 'string');
        } catch { /* ignore */ }
        return {
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          user: r.user ? {
            ...r.user,
            verificationTiers: userTiers,
            verifiedAt: (r.user as any).verifiedAt ? (r.user as any).verifiedAt.toISOString() : null,
          } : r.user,
        };
      }),
    });
  } catch (error) {
    console.error('GET /api/payment-requests error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/**
 * POST — create a pending PaymentRequest for the authenticated user.
 *
 * Triggered when a user opens the payment chat (PendingPaymentPage). The
 * request is shown in the admin's Payment Requests dashboard so the admin
 * knows a payment is in-flight, even before they manually toggle "Paid".
 *
 * Idempotent: if the user already has a pending PaymentRequest, we return
 * that one instead of creating a duplicate.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    if (role !== 'agent' && role !== 'client') {
      return NextResponse.json({ error: 'Only agents and call centers can request subscriptions' }, { status: 403 });
    }

    // Idempotency check: skip if a pending request already exists for this user.
    const existing = await db.paymentRequest.findFirst({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return NextResponse.json({
        paymentRequest: {
          ...existing,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        },
        message: 'A pending payment request already exists for this user.',
      });
    }

    // Tier config — mirrors /api/users/mark-paid
    const isAgent = role === 'agent';
    const tier = isAgent ? 'agent_quarterly' : 'client_yearly';
    const amount = isAgent ? 1000 : 3000;
    const description = isAgent ? 'Agent Quarterly (3 months)' : 'Call Center Yearly (12 months)';

    // Parse optional body for adminId (used to notify a specific admin).
    let adminId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.adminId === 'string') adminId = body.adminId;
    } catch { /* body is optional */ }

    const pr = await db.paymentRequest.create({
      data: {
        userId,
        role,
        feeType: tier,
        amount,
        currency: 'HTG',
        status: 'pending',
      },
    });

    // ─── Notify admins (in-app notification) ───────────────────────────
    // We notify every admin + payment_taker in the DB so the request can't
    // be missed just because one specific admin is offline.
    try {
      const admins = await db.user.findMany({
        where: { role: { in: ['admin', 'payment_taker'] } },
        select: { id: true },
      });

      // Look up the requester's display name (call center → company name).
      let requesterName = 'A user';
      try {
        const requester = await db.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true },
        });
        if (requester) {
          if (requester.role === 'client') {
            const client = await db.client.findUnique({
              where: { userId },
              select: { companyName: true },
            });
            requesterName = client?.companyName || requester.name;
          } else {
            requesterName = requester.name;
          }
        }
      } catch { /* ignore */ }

      const title = 'New Payment Request';
      const message = `${requesterName} requested ${description} (${amount} HTG). Open the payment chat to coordinate.`;
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          title,
          message,
          type: 'payment_request',
          pushBody: `${requesterName}: ${description} — ${amount} HTG`,
          pushUrl: 'https://167.86.124.101:4001/#payment-taker-dashboard',
        });
      }
    } catch (notifErr) {
      console.error('[payment-requests POST] notification failed:', notifErr);
    }

    return NextResponse.json({
      paymentRequest: {
        ...pr,
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/payment-requests error:', error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}

// PATCH - approve or reject a payment request
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    // ROLE MERGE: payment_taker is treated as admin
    const effectiveRole = auth.role === 'payment_taker' ? 'admin' : auth.role;
    if (effectiveRole !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
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

    // If approved, activate the user AND set paid=true with paidUntil
    // computed from the user's role:
    //   agent  → +3 months  (1,000 HTG / quarter)
    //   client → +12 months (3,000 HTG / year)
    if (status === 'approved') {
      const target = await db.user.findUnique({ where: { id: pr.userId }, select: { role: true } });
      if (!target) {
        // User was deleted — record the approval on the PaymentRequest but
        // don't try to update a non-existent user. Return success so the
        // admin dashboard doesn't crash on stale requests.
        return NextResponse.json({ paymentRequest: { ...updated, createdAt: updated.createdAt.toISOString() }, warning: 'User no longer exists — payment recorded but user not updated.' });
      }
      const isAgent = target.role === 'agent';
      const isClient = target.role === 'client';
      const months = isAgent ? 3 : isClient ? 12 : 0;
      const tier = isAgent ? 'agent_quarterly' : isClient ? 'client_yearly' : null;
      const until = months > 0 ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) : null;

      try {
        await db.user.update({
          where: { id: pr.userId },
          data: {
            isActive: true,
            accountStatus: 'active',
            paid: months > 0,
            paidUntil: until,
            paymentTier: tier,
          },
        });
      } catch (updateErr) {
        console.error('[payment-requests PATCH] user update failed:', updateErr);
        // Non-fatal — the PaymentRequest is already approved.
      }
    }

    return NextResponse.json({ paymentRequest: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (error) {
    console.error('PATCH /api/payment-requests error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
