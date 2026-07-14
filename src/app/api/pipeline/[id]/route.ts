import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stage = await db.pipelineStage.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!stage) {
      return NextResponse.json({ error: 'Pipeline stage not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...stage,
      interviewDate: stage.interviewDate?.toISOString() || null,
      createdAt: stage.createdAt.toISOString(),
      updatedAt: stage.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/pipeline/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline stage' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.pipelineStage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pipeline stage not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.stage !== undefined) data.stage = body.stage;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.interviewer !== undefined) data.interviewer = body.interviewer || null;
    if (body.interviewDate !== undefined) {
      data.interviewDate = body.interviewDate ? new Date(body.interviewDate) : null;
    }
    if (body.createdBy !== undefined) data.createdBy = body.createdBy || null;

    const pipelineStage = await db.pipelineStage.update({
      where: { id },
      data,
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    // If stage changed, update agent status to match
    if (body.stage !== undefined && body.stage !== existing.stage) {
      await db.agent.update({
        where: { id: existing.agentId },
        data: { status: body.stage },
      });
    }

    return NextResponse.json({
      ...pipelineStage,
      interviewDate: pipelineStage.interviewDate?.toISOString() || null,
      createdAt: pipelineStage.createdAt.toISOString(),
      updatedAt: pipelineStage.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/pipeline/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update pipeline stage' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.pipelineStage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pipeline stage not found' }, { status: 404 });
    }

    await db.pipelineStage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pipeline/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete pipeline stage' }, { status: 500 });
  }
}