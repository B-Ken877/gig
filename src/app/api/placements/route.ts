import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/placements
//   ?agentId=...  → list placements for an agent (agent or admin)
//   no params    → list all placements (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    // If no agentId filter, admin only
    if (!agentId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const placements = await db.placement.findMany({
      where,
      include: {
        jobPost: true,
        agent: { include: { user: { select: { name: true, email: true, avatar: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cleaned = placements.map(p => ({
      id: p.id,
      agentId: p.agentId,
      jobPostId: p.jobPostId,
      position: p.position,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      salary: p.salary,
      nextSalaryDate: p.nextSalaryDate?.toISOString() || null,
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      jobPost: p.jobPost ? {
        id: p.jobPost.id,
        jobTitle: p.jobPost.jobTitle,
        hourlyRate: p.jobPost.hourlyRate,
        payFrequency: p.jobPost.payFrequency,
        category: p.jobPost.category,
        shift: p.jobPost.shift,
        location: p.jobPost.location,
      } : null,
      agent: p.agent ? {
        id: p.agent.id,
        name: p.agent.user?.name,
        email: p.agent.user?.email,
        avatar: p.agent.user?.avatar,
        country: p.agent.country,
      } : null,
    }));

    return NextResponse.json({ placements: cleaned });
  } catch (error) {
    console.error('GET /api/placements error:', error);
    return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 });
  }
}

// POST /api/placements — admin only. Manually create a placement (e.g., for
// agents hired outside the application flow).
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { agentId, jobPostId, position, salary, startDate, nextSalaryDate, notes } = body;
    if (!agentId || !jobPostId) return NextResponse.json({ error: 'agentId and jobPostId required' }, { status: 400 });

    const placement = await db.placement.create({
      data: {
        agentId,
        jobPostId,
        position: position || 'Agent',
        salary: salary ? Number(salary) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        nextSalaryDate: nextSalaryDate ? new Date(nextSalaryDate) : null,
        status: 'active',
        notes: notes || null,
      },
    });

    return NextResponse.json({
      placement: {
        id: placement.id,
        agentId: placement.agentId,
        jobPostId: placement.jobPostId,
        status: placement.status,
        createdAt: placement.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/placements error:', error);
    return NextResponse.json({ error: 'Failed to create placement' }, { status: 500 });
  }
}
