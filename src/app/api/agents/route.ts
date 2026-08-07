import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/agents
//   ?id=...      → fetch single agent by agent ID
//   ?userId=...  → fetch the agent record for a given user (used by profile form)
//   ?q=...       → search by name/email (admin only)
//   no params    → list all agents (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q');
    const userId = searchParams.get('userId');

    const safeJson = <T,>(raw: string | null | undefined, fallback: T): T => {
      if (raw === null || raw === undefined || raw === '') return fallback;
      try { return JSON.parse(raw) as T; } catch { return typeof fallback === 'string' ? raw as unknown as T : fallback; }
    };

    const selectUser = { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true };

    if (id) {
      const agent = await db.agent.findUnique({
        where: { id },
        include: { user: { select: selectUser }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({
        agent: {
          ...agent,
          languages: safeJson<string[]>(agent.languages, []),
          skills: safeJson<string[]>(agent.skills, []),
          education: safeJson<string[]>(agent.education, []),
          previousEmployers: safeJson<string[]>(agent.previousEmployers, []),
          computerSpecs: safeJson<string>(agent.computerSpecs, ''),
          user: agent.user ? { ...agent.user, phone: isAdmin ? agent.user.phone : undefined } : agent.user,
        },
      });
    }

    if (userId) {
      const agent = await db.agent.findUnique({
        where: { userId },
        include: { user: { select: selectUser }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      const isOwner = auth.userId === userId;
      return NextResponse.json({
        ...agent,
        languages: safeJson<string[]>(agent.languages, []),
        skills: safeJson<string[]>(agent.skills, []),
        education: safeJson<string[]>(agent.education, []),
        previousEmployers: safeJson<string[]>(agent.previousEmployers, []),
        computerSpecs: safeJson<string>(agent.computerSpecs, ''),
        dateOfBirth: agent.dateOfBirth?.toISOString() || null,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        user: agent.user ? { ...agent.user, phone: (isOwner || isAdmin) ? agent.user.phone : undefined } : agent.user,
      });
    }

    const where: Record<string, unknown> = {};
    if (q) {
      where.user = { OR: [{ name: { contains: q } }, { email: { contains: q } }] };
    }

    const agents = await db.agent.findMany({
      where,
      include: { user: { select: selectUser }, documents: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const validAgents = agents.filter(a => a.user !== null && a.user !== undefined);

    return NextResponse.json({ agents: validAgents.map(a => ({
      ...a,
      languages: safeJson<string[]>(a.languages, []),
      skills: safeJson<string[]>(a.skills, []),
      education: safeJson<string[]>(a.education, []),
      previousEmployers: safeJson<string[]>(a.previousEmployers, []),
      user: a.user ? { ...a.user, phone: isAdmin ? a.user.phone : undefined } : a.user,
    })) });
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH /api/agents — update an agent's profile fields.
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });

    // Serialize arrays/objects to JSON strings for Prisma
    const updateData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val) || (typeof val === 'object' && val !== null && !(val instanceof Date))) {
        updateData[key] = JSON.stringify(val);
      } else {
        updateData[key] = val;
      }
    }

    const agent = await db.agent.update({ where: { id }, data: updateData });
    return NextResponse.json({ agent: { id: agent.id } });
  } catch (error) {
    console.error('PATCH /api/agents error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
