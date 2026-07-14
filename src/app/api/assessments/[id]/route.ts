import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...assessment,
      answers: JSON.parse(assessment.answers || '[]'),
      completedAt: assessment.completedAt?.toISOString() || null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.assessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.totalQuestions !== undefined) data.totalQuestions = body.totalQuestions;
    if (body.correctAnswers !== undefined) data.correctAnswers = body.correctAnswers;
    if (body.score !== undefined) data.score = body.score;
    if (body.passed !== undefined) data.passed = Boolean(body.passed);
    if (body.section !== undefined) data.section = body.section;
    if (body.answers !== undefined) data.answers = JSON.stringify(body.answers);
    if (body.completedAt !== undefined) {
      data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    const assessment = await db.assessment.update({
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

    return NextResponse.json({
      ...assessment,
      answers: JSON.parse(assessment.answers || '[]'),
      completedAt: assessment.completedAt?.toISOString() || null,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}