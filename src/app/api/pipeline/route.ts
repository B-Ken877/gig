import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'recruiter', 'operations']);

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    const stages = await db.pipelineStage.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = stages.map((s) => ({
      ...s,
      interviewDate: s.interviewDate?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/pipeline error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline stages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'recruiter', 'operations']);

    const body = await req.json();
    const { agentId, stage, notes, interviewer, interviewDate, createdBy } = body;

    if (!agentId || !stage) {
      return NextResponse.json({ error: 'Missing agentId or stage' }, { status: 400 });
    }

    const pipelineStage = await db.pipelineStage.create({
      data: {
        agentId,
        stage,
        notes: notes || null,
        interviewer: interviewer || null,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        createdBy: createdBy || null,
      },
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    // Update agent status to match latest pipeline stage
    await db.agent.update({
      where: { id: agentId },
      data: { status: stage },
    });

    return NextResponse.json({
      ...pipelineStage,
      interviewDate: pipelineStage.interviewDate?.toISOString() || null,
      createdAt: pipelineStage.createdAt.toISOString(),
      updatedAt: pipelineStage.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/pipeline error:', error);
    return NextResponse.json({ error: 'Failed to create pipeline stage' }, { status: 500 });
  }
}