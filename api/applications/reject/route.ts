import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/applications/reject
 *  Client only. Body: { notificationId: string, agentId?: string, needTitle?: string }
 *
 *  Effect:
 *    1. Marks the interest notification as rejected (by updating the JSON
 *       payload to include `rejectedAt: <iso>`). The notification is preserved
 *       so the client can still see rejected applicants in a "rejected" filter
 *       if they choose to (and so we don't break referential integrity).
 *    2. Sends the agent an in-app + push notification "Your application was
 *       declined by X" — polite and transparent.
 *
 *  Returns: { success, rejectedAt }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const body = await req.json();
    const notificationId = (body?.notificationId || '').toString();
    if (!notificationId) return NextResponse.json({ error: 'notificationId required' }, { status: 400 });

    // Verify ownership + that it's an interest notification
    const notif = await db.notification.findUnique({ where: { id: notificationId } });
    if (!notif) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    if (notif.userId !== auth.userId) return NextResponse.json({ error: 'Not your application' }, { status: 403 });
    if (notif.type !== 'interest') return NextResponse.json({ error: 'Not an application' }, { status: 400 });

    // Parse existing snapshot, set rejectedAt (idempotent).
    let parsed: any = {};
    try { parsed = JSON.parse(notif.message); } catch { /* leave empty */ }
    if (!parsed.rejectedAt) {
      parsed.rejectedAt = new Date().toISOString();
      await db.notification.update({
        where: { id: notificationId },
        data: { message: JSON.stringify(parsed) },
      });
    }

    // Resolve the client's company name for the agent-facing notification
    const clientRow = await db.client.findUnique({
      where: { userId: auth.userId },
      select: { companyName: true },
    });
    const ownerName = clientRow?.companyName || 'A call center';

    // Notify the agent (in-app + push) — only on first rejection
    const agentUserId = parsed.agentId;
    if (agentUserId && !parsed._rejectNotified) {
      try {
        await createNotification({
          userId: agentUserId,
          title: 'Application Update',
          message: ownerName + ' declined your application for "' + (parsed.needTitle || 'this role') + '".',
          type: 'application',
          pushBody: ownerName + ' declined your application. Keep applying — your next role is out there!',
          pushUrl: 'https://167.86.124.101:4001/#agent-applications',
        });
        // Mark that we've notified (avoids duplicate push if client re-rejects)
        parsed._rejectNotified = true;
        await db.notification.update({
          where: { id: notificationId },
          data: { message: JSON.stringify(parsed) },
        });
      } catch (notifErr) {
        console.error('[applications/reject POST] notification failed:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      rejectedAt: parsed.rejectedAt,
    });
  } catch (error) {
    console.error('POST /api/applications/reject error:', error);
    return NextResponse.json({ error: 'Failed to reject application' }, { status: 500 });
  }
}
