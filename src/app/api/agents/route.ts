import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// Safe JSON parse — returns the raw string if it can't be parsed as JSON.
// The Agent.computerSpecs column is typed as String in the schema (default "{}"),
// but the profile form lets the user type free text (e.g. "Dell Latitude, i7"),
// which is not valid JSON. We must not crash the GET endpoint on such values.
function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return (typeof fallback === 'string' ? raw as unknown as T : fallback);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q');

    const userId = searchParams.get('userId');

    if (id) {
      const agent = await db.agent.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({ agent: { ...agent, languages: safeJson<string[]>(agent.languages, []), skills: safeJson<string[]>(agent.skills, []), education: safeJson<string[]>(agent.education, []), previousEmployers: safeJson<string[]>(agent.previousEmployers, []), computerSpecs: safeJson<string>(agent.computerSpecs, '') } });
    }

    if (userId) {
      const agent = await db.agent.findUnique({
        where: { userId },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({ ...agent, languages: safeJson<string[]>(agent.languages, []), skills: safeJson<string[]>(agent.skills, []), education: safeJson<string[]>(agent.education, []), previousEmployers: safeJson<string[]>(agent.previousEmployers, []), computerSpecs: safeJson<string>(agent.computerSpecs, ''), dateOfBirth: agent.dateOfBirth?.toISOString() || null, createdAt: agent.createdAt.toISOString(), updatedAt: agent.updatedAt.toISOString() });
    }

    const where: Record<string, unknown> = {};
    if (q) {
      where.user = { OR: [{ name: { contains: q } }, { email: { contains: q } }] };
    }

    const agents = await db.agent.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ agents: agents.map(a => ({
      ...a,
      languages: safeJson<string[]>(a.languages, []),
      skills: safeJson<string[]>(a.skills, []),
      education: safeJson<string[]>(a.education, []),
      previousEmployers: safeJson<string[]>(a.previousEmployers, []),
    })) });
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

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
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('PATCH /api/agents error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
