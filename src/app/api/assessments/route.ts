import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    const assessments = await db.assessment.findMany({
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

    const parsed = assessments.map((a) => ({
      ...a,
      answers: JSON.parse(a.answers || '[]'),
      completedAt: a.completedAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/assessments error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      section,
      totalQuestions,
      correctAnswers,
      score,
      passed,
      answers,
    } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const assessment = await db.assessment.create({
      data: {
        agentId,
        section: section || 'general',
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        score: score ?? 0,
        passed: passed ?? false,
        answers: answers ? JSON.stringify(answers) : '[]',
        completedAt: passed ? new Date() : null,
      },
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
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assessments error:', error);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}