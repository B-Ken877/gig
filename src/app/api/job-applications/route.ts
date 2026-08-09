import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// GET /api/job-applications
//   ?agentId=...   → list applications for an agent (agent or admin)
//   ?jobPostId=... → list applications for a job (admin only)
//   no params      → list all applications (admin only)
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

    if (!agentId && !jobPostId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const apps = await db.jobApplication.findMany({
      where,
      include: {
        jobPost: true,
        agent: { include: { user: { select: { name: true, email: true, avatar: true } } } },
        videoResponses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const cleaned = apps.map(a => ({
      id: a.id,
      agentId: a.agentId,
      jobPostId: a.jobPostId,
      status: a.status,
      coverMessage: a.coverMessage,
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
        assessmentQuestions: JSON.parse(a.jobPost.assessmentQuestions || '[]'),
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
      videoResponses: a.videoResponses.map(v => ({
        id: v.id,
        questionIndex: v.questionIndex,
        questionText: v.questionText,
        videoUrl: v.videoUrl,
        durationSeconds: v.durationSeconds,
        createdAt: v.createdAt.toISOString(),
      })),
      videoCount: a.videoResponses.length,
    }));

    return NextResponse.json({ applications: cleaned });
  } catch (error) {
    console.error('GET /api/job-applications error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

// POST /api/job-applications
// Agent applies for a job. Body: { jobPostId, coverMessage?, videoResponses: [{ questionIndex, questionText, videoUrl, durationSeconds? }] }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can apply' }, { status: 403 });

    const body = await req.json();
    const { jobPostId, coverMessage, videoResponses } = body;
    if (!jobPostId) return NextResponse.json({ error: 'jobPostId is required' }, { status: 400 });
    if (!Array.isArray(videoResponses) || videoResponses.length === 0) {
      return NextResponse.json({ error: 'Video responses are required' }, { status: 400 });
    }

    const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
    if (!agent) return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });

    const job = await db.jobPost.findUnique({ where: { id: jobPostId } });
    if (!job || !job.isActive) return NextResponse.json({ error: 'Job not available' }, { status: 404 });

    let application;
    try {
      application = await db.jobApplication.create({
        data: {
          agentId: agent.id,
          jobPostId: job.id,
          status: 'applied',
          coverMessage: coverMessage || null,
        },
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('Unique constraint')) {
        return NextResponse.json({ error: 'You have already applied for this job' }, { status: 409 });
      }
      throw err;
    }

    // Save video responses
    for (const vr of videoResponses) {
      await db.videoResponse.create({
        data: {
          applicationId: application.id,
          agentId: agent.id,
          jobPostId: job.id,
          questionIndex: Number(vr.questionIndex) || 0,
          questionText: vr.questionText || '',
          videoUrl: vr.videoUrl,
          durationSeconds: vr.durationSeconds ? Number(vr.durationSeconds) : null,
        },
      });
    }

    // Notify all admins
    try {
      const admins = await db.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true },
      });
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          title: 'New Job Application',
          message: (agent.user ? (await db.user.findUnique({ where: { id: agent.userId } }))?.name : 'An agent') + ' applied for "' + job.jobTitle + '".',
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
