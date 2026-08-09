import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/salary-dates
//   Admin: returns all salary dates (with job info).
//   Agent: returns salary dates ONLY for jobs they have active placements on.
//   Optional ?jobPostId=... filter for both.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const jobPostId = searchParams.get('jobPostId');

    const where: Record<string, unknown> = {};
    if (jobPostId) where.jobPostId = jobPostId;

    // Agents: restrict to jobs they have active placements on.
    if (auth.role === 'agent') {
      const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
      if (!agent) return NextResponse.json({ salaryDates: [] });
      const placements = await db.placement.findMany({
        where: { agentId: agent.id, status: 'active' },
        select: { jobPostId: true },
      });
      const jobIds = [...new Set(placements.map(p => p.jobPostId))];
      if (jobIds.length === 0) return NextResponse.json({ salaryDates: [] });
      where.jobPostId = { in: jobIds };
    }

    const dates = await db.salaryDate.findMany({
      where,
      orderBy: { payDate: 'asc' },
      include: { jobPost: { select: { id: true, jobTitle: true, category: true } } },
    });

    const cleaned = dates.map(d => ({
      id: d.id,
      jobPostId: d.jobPostId,
      jobTitle: d.jobPost?.jobTitle || 'Unknown Job',
      jobCategory: d.jobPost?.category || null,
      payDate: d.payDate.toISOString(),
      frequency: d.frequency,
      description: d.description,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ salaryDates: cleaned });
  } catch (error) {
    console.error('GET /api/salary-dates error:', error);
    return NextResponse.json({ error: 'Failed to fetch salary dates' }, { status: 500 });
  }
}

// POST /api/salary-dates — admin only. Creates a per-job salary date.
// Body: { jobPostId, payDate, frequency, description }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { jobPostId, payDate, frequency, description } = body;
    if (!jobPostId) return NextResponse.json({ error: 'Please select a job (project)' }, { status: 400 });
    if (!payDate) return NextResponse.json({ error: 'Pay date is required' }, { status: 400 });

    // Verify the job exists.
    const job = await db.jobPost.findUnique({ where: { id: jobPostId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const created = await db.salaryDate.create({
      data: {
        jobPostId,
        payDate: new Date(payDate),
        frequency: frequency || 'bi-weekly',
        description: description || null,
      },
      include: { jobPost: { select: { jobTitle: true } } },
    });

    return NextResponse.json({
      salaryDate: {
        id: created.id,
        jobPostId: created.jobPostId,
        jobTitle: created.jobPost?.jobTitle || 'Unknown Job',
        payDate: created.payDate.toISOString(),
        frequency: created.frequency,
        description: created.description,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/salary-dates error:', error);
    return NextResponse.json({ error: 'Failed to create salary date' }, { status: 500 });
  }
}
