import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q');

    if (id) {
      const agent = await db.agent.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({ agent: { ...agent, languages: JSON.parse(agent.languages || '[]'), skills: JSON.parse(agent.skills || '[]'), education: JSON.parse(agent.education || '[]'), previousEmployers: JSON.parse(agent.previousEmployers || '[]'), computerSpecs: JSON.parse(agent.computerSpecs || '{}') } });
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

    return NextResponse.json({ agents: agents.map(a => ({ ...a, languages: JSON.parse(a.languages || '[]'), skills: JSON.parse(a.skills || '[]') })) });
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
