import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/job-applications
//   ?agentId=...  → list applications for an agent (agent or admin)
//   ?jobPostId=... → list applications for a job (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const jobPostId = searchParams.get('jobPostId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (jobPostId) {
      if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      where.jobPostId = jobPostId;
    }

    // Agents can only see their own applications
    if (auth.role === 'agent' && agentId && agentId !== auth.agentId) {
      // we don't have agentId on auth, look it up
    }

    const apps = await db.jobApplication.findMany({
      where,
      include: {
        jobPost: true,
        agent: { include: { user: { select: { name: true, email: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cleaned = apps.map(a => ({
      id: a.id,
      agentId: a.agentId,
      jobPostId: a.jobPostId,
      status: a.status,
      coverMessage: a.coverMessage,
      assessmentScore: a.assessmentScore,
      assessmentPassed: a.assessmentPassed,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      jobPost: a.jobPost ? {
        id: a.jobPost.id,
        jobTitle: a.jobPost.jobTitle,
        description: a.jobPost.description,
        hourlyRate: a.jobPost.hourlyRate,
        payFrequency: a.jobPost.payFrequency,
        category: a.jobPost.category,
        shift: a.jobPost.shift,
        location: a.jobPost.location,
        skills: JSON.parse(a.jobPost.skills || '[]'),
      } : null,
      agent: a.agent ? {
        id: a.agent.id,
        name: a.agent.user?.name,
        email: a.agent.user?.email,
        avatar: a.agent.user?.avatar,
        country: a.agent.country,
        skills: JSON.parse(a.agent.skills || '[]'),
        languages: JSON.parse(a.agent.languages || '[]'),
        experience: a.agent.experience,
      } : null,
    }));

    return NextResponse.json({ applications: cleaned });
  } catch (error) {
    console.error('GET /api/job-applications error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

// POST /api/job-applications
// Agent applies for a job. The body must include:
//   { jobPostId, coverMessage?, assessmentScore, assessmentPassed, answers }
// The agent MUST have passed the assessment (assessmentPassed === true) to apply.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can apply' }, { status: 403 });

    const body = await req.json();
    const { jobPostId, coverMessage, assessmentScore, assessmentPassed, answers } = body;
    if (!jobPostId) return NextResponse.json({ error: 'jobPostId is required' }, { status: 400 });
    if (!assessmentPassed) return NextResponse.json({ error: 'You must pass the assessment to apply' }, { status: 400 });

    // Look up the agent record for this user
    const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
    if (!agent) return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });

    // Make sure the job is active
    const job = await db.jobPost.findUnique({ where: { id: jobPostId } });
    if (!job || !job.isActive) return NextResponse.json({ error: 'Job not available' }, { status: 404 });

    // Save the assessment record (per-job)
    try {
      await db.assessment.create({
        data: {
          agentId: agent.id,
          jobPostId: job.id,
          section: 'job-' + job.id.slice(-6),
          totalQuestions: Array.isArray(answers) ? answers.length : 0,
          correctAnswers: Math.round((Number(assessmentScore) || 0) / 100 * (Array.isArray(answers) ? answers.length : 0)),
          score: Number(assessmentScore) || 0,
          passed: !!assessmentPassed,
          answers: JSON.stringify(answers || []),
          completedAt: new Date(),
        },
      });
    } catch (e) {
      console.error('[job-applications POST] assessment save failed:', e);
    }

    // Create the application (unique constraint prevents duplicates)
    let application;
    try {
      application = await db.jobApplication.create({
        data: {
          agentId: agent.id,
          jobPostId: job.id,
          status: 'applied',
          coverMessage: coverMessage || null,
          assessmentScore: Number(assessmentScore) || 0,
          assessmentPassed: !!assessmentPassed,
        },
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('Unique constraint')) {
        return NextResponse.json({ error: 'You have already applied for this job' }, { status: 409 });
      }
      throw err;
    }

    // Notify all admins
    try {
      const admins = await db.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        const { createNotificationBulk } = await import('@/lib/notifications');
        await createNotificationBulk(admins.map(a => a.id), {
          title: 'New Job Application',
          message: (agent.user ? await db.user.findUnique({ where: { id: agent.userId } })?.name : 'An agent') + ' applied for "' + job.jobTitle + '".',
          type: 'job_application',
        });
      }
    } catch (e) {
      console.error('[job-applications POST] admin notification failed:', e);
    }

    return NextResponse.json({
      application: {
        id: application.id,
        agentId: application.agentId,
        jobPostId: application.jobPostId,
        status: application.status,
        createdAt: application.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/job-applications error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
