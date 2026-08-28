import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// PATCH /api/interviews/[id]
// Admin updates an interview's status (mark completed / cancelled) or reschedules.
// Body: { status?: 'scheduled'|'completed'|'cancelled', scheduledAt?: ISO string, timezone?, location?, notes? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status, scheduledAt, timezone, location, notes } = body as {
      status?: string;
      scheduledAt?: string;
      timezone?: string;
      location?: string;
      notes?: string;
    };

    if (status && !['scheduled', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await db.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            jobPost: { select: { jobTitle: true } },
            agent: { select: { userId: true } },
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (scheduledAt) {
      const when = new Date(scheduledAt);
      if (isNaN(when.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      data.scheduledAt = when;
    }
    if (timezone !== undefined) data.timezone = timezone || null;
    if (location !== undefined) data.location = location || null;
    if (notes !== undefined) data.notes = notes || null;

    const updated = await db.interview.update({ where: { id }, data });

    // If status changed to "completed", optionally notify the agent.
    // If cancelled, notify the agent.
    if (status && status !== existing.status && existing.application?.agent?.userId) {
      const jobTitle = existing.application?.jobPost?.jobTitle || 'the position';
      try {
        if (status === 'completed') {
          await createNotification({
            userId: existing.application.agent.userId,
            title: 'Interview Completed',
            message: 'Thank you for attending the interview for "' + jobTitle + '". We will be in touch soon with the next steps.',
            type: 'interview_completed',
            pushBody: 'Thank you for attending the interview. We will be in touch soon.',
          });
        } else if (status === 'cancelled') {
          await createNotification({
            userId: existing.application.agent.userId,
            title: 'Interview Cancelled',
            message: 'Your interview for "' + jobTitle + '" has been cancelled. Please check your messages for more information.',
            type: 'interview_cancelled',
            pushBody: 'Your interview for "' + jobTitle + '" has been cancelled.',
          });
        }
      } catch (e) {
        console.error('[interviews PATCH] notification failed:', e);
      }
    }

    return NextResponse.json({
      interview: {
        id: updated.id,
        status: updated.status,
        scheduledAt: updated.scheduledAt.toISOString(),
        timezone: updated.timezone,
        location: updated.location,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('PATCH /api/interviews/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}

// GET /api/interviews/[id] — fetch a single interview (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            jobPost: true,
            agent: { include: { user: { select: { name: true, email: true, avatar: true } } } },
          },
        },
      },
    });
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    return NextResponse.json({
      interview: {
        id: interview.id,
        applicationId: interview.applicationId,
        agentId: interview.agentId,
        jobPostId: interview.jobPostId,
        scheduledAt: interview.scheduledAt.toISOString(),
        timezone: interview.timezone,
        location: interview.location,
        notes: interview.notes,
        status: interview.status,
        conversationId: interview.conversationId,
        createdAt: interview.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/interviews/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch interview' }, { status: 500 });
  }
}
