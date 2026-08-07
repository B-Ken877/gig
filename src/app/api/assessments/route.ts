import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/assessments?agentId=...&jobPostId=...
// Returns assessments for an agent, optionally filtered by job.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const jobPostId = searchParams.get('jobPostId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (jobPostId) where.jobPostId = jobPostId;

    const assessments = await db.assessment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const cleaned = assessments.map(a => ({
      ...a,
      answers: JSON.parse(a.answers || '[]'),
      completedAt: a.completedAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return NextResponse.json({ assessments: cleaned });
  } catch (error) {
    console.error('GET /api/assessments error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

// POST /api/assessments — agent submits assessment results.
// Body: { jobPostId, totalQuestions, correctAnswers, score, passed, answers }
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can submit assessments' }, { status: 403 });

    const body = await req.json();
    const { jobPostId, totalQuestions, correctAnswers, score, passed, answers } = body;

    const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
    if (!agent) return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });

    // Upsert: if an assessment for this (agent, job) already exists, update it;
    // otherwise create a new one. This lets agents retry the assessment.
    const existing = jobPostId
      ? await db.assessment.findFirst({ where: { agentId: agent.id, jobPostId } })
      : null;

    const data = {
      agentId: agent.id,
      jobPostId: jobPostId || null,
      section: jobPostId ? 'job-' + String(jobPostId).slice(-6) : 'general',
      totalQuestions: Number(totalQuestions) || 0,
      correctAnswers: Number(correctAnswers) || 0,
      score: Number(score) || 0,
      passed: !!passed,
      answers: JSON.stringify(answers || []),
      completedAt: new Date(),
    };

    let assessment;
    if (existing) {
      assessment = await db.assessment.update({ where: { id: existing.id }, data });
    } else {
      assessment = await db.assessment.create({ data });
    }

    return NextResponse.json({
      id: assessment.id,
      passed: assessment.passed,
      score: assessment.score,
      completedAt: assessment.completedAt?.toISOString() || null,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assessments error:', error);
    return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 });
  }
}
