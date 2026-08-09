import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// PATCH /api/agents/verify-id/[id] — admin approves or rejects the ID verification.
//   body: { status: 'verified' | 'rejected', notes?: string }
//   [id] is the Agent id (not the User id).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Use "verified" or "rejected".' }, { status: 400 });
    }
    // Rejection requires a reason — the admin must explain why
    if (status === 'rejected' && (!notes || !notes.trim())) {
      return NextResponse.json({ error: 'Please provide a reason for the rejection. The agent needs to know why their verification was not approved.' }, { status: 400 });
    }

    const agent = await db.agent.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    await db.agent.update({
      where: { id },
      data: {
        idVerificationStatus: status,
        idVerificationReviewedAt: new Date(),
        idVerificationReviewedBy: auth.userId,
        idVerificationNotes: notes || null,
      },
    });

    // Notify the agent
    try {
      if (status === 'verified') {
        await createNotification({
          userId: agent.user.id,
          title: 'Identity Verified ✓',
          message: 'Your identity has been verified. You can now apply for jobs on the platform.',
          type: 'id_verified',
        });
      } else {
        await createNotification({
          userId: agent.user.id,
          title: 'ID Verification Not Approved',
          message: `Your ID verification was not approved. Reason: ${notes}. Please address this issue and submit your verification again.`,
          type: 'id_rejected',
        });
      }
    } catch (e) {
      console.error('[verify-id PATCH] notification failed:', e);
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('PATCH /api/agents/verify-id/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
  }
}
