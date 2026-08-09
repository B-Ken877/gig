import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// PATCH /api/job-applications/[id] — admin updates application status.
//   body: { status: 'hired' | 'rejected' }
// If status === 'hired', a Placement is auto-created + agent notified.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status, salary, startDate, nextSalaryDate } = body;
    if (!['hired', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await db.jobApplication.update({
      where: { id },
      data: { status },
    });

    const app = await db.jobApplication.findUnique({
      where: { id },
      include: { jobPost: true, agent: { include: { user: true } } },
    });

    if (status === 'hired' && app) {
      const existing = await db.placement.findFirst({
        where: { agentId: app.agentId, jobPostId: app.jobPostId, status: 'active' },
      });
      if (!existing) {
        await db.placement.create({
          data: {
            agentId: app.agentId,
            jobPostId: app.jobPostId,
            position: app.jobPost?.jobTitle || 'Agent',
            salary: salary ? Number(salary) : (app.jobPost?.hourlyRate ? Number(app.jobPost.hourlyRate) : null),
            startDate: startDate ? new Date(startDate) : new Date(),
            nextSalaryDate: nextSalaryDate ? new Date(nextSalaryDate) : null,
            status: 'active',
          },
        });
      }
      // Notify the agent: "Congratulations, your application has been approved, and you've been hired for the job."
      try {
        await createNotification({
          userId: app.agent.userId,
          title: 'Congratulations — You\'re Hired!',
          message: 'Your application has been approved, and you\'ve been hired for "' + (app.jobPost?.jobTitle || 'the job') + '". Check "My Work" for details.',
          type: 'hired',
        });
      } catch (e) {
        console.error('[job-applications PATCH] notification failed:', e);
      }
    } else if (status === 'rejected' && app) {
      try {
        await createNotification({
          userId: app.agent.userId,
          title: 'Application Update',
          message: 'Your application for "' + (app.jobPost?.jobTitle || 'the job') + '" was not selected at this time. Keep applying for other opportunities!',
          type: 'rejected',
        });
      } catch (e) {
        console.error('[job-applications PATCH] rejection notification failed:', e);
      }
    }

    return NextResponse.json({ application: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('PATCH /api/job-applications/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
