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
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q');
    const userId = searchParams.get('userId');

    // Helper: strip phone from the nested user object unless admin (or
    // owner when allowOwner=true — only for ?userId= profile-edit path).
    const stripPhone = (userObj: any, allowOwner: boolean, ownerUserId?: string) => {
      if (!userObj) return userObj;
      const isOwner = allowOwner && ownerUserId && auth.userId === ownerUserId;
      const canSeePhone = isAdmin || isOwner;
      return { ...userObj, phone: canSeePhone ? userObj.phone : undefined };
    };

    if (id) {
      const agent = await db.agent.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true, verificationTiers: true, verifiedAt: true, gigScore: true } }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({ agent: { ...agent, languages: safeJson<string[]>(agent.languages, []), skills: safeJson<string[]>(agent.skills, []), education: safeJson<string[]>(agent.education, []), previousEmployers: safeJson<string[]>(agent.previousEmployers, []), computerSpecs: safeJson<string>(agent.computerSpecs, ''), user: agent.user ? stripPhone({ ...agent.user, verificationTiers: safeJson<string[]>(agent.user.verificationTiers, []) }, false) : agent.user } });
    }

    if (userId) {
      // Find by userId — used by the profile form to load the current user's
      // own data for editing. Owner exception applies (they need their phone).
      const agent = await db.agent.findUnique({
        where: { userId },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true, verificationTiers: true, verifiedAt: true, gigScore: true } }, documents: true, availabilitySlots: true },
      });
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      return NextResponse.json({ ...agent, languages: safeJson<string[]>(agent.languages, []), skills: safeJson<string[]>(agent.skills, []), education: safeJson<string[]>(agent.education, []), previousEmployers: safeJson<string[]>(agent.previousEmployers, []), computerSpecs: safeJson<string>(agent.computerSpecs, ''), dateOfBirth: agent.dateOfBirth?.toISOString() || null, createdAt: agent.createdAt.toISOString(), updatedAt: agent.updatedAt.toISOString(), user: agent.user ? stripPhone({ ...agent.user, verificationTiers: safeJson<string[]>(agent.user.verificationTiers, []) }, true, agent.userId) : agent.user });
    }

    const where: Record<string, unknown> = {};
    if (q) {
      where.user = { OR: [{ name: { contains: q } }, { email: { contains: q } }] };
    }

    const agents = await db.agent.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true, verificationTiers: true, verifiedAt: true, gigScore: true } }, documents: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // DEFENSIVE: filter out any agent whose user relation is null (orphan).
    const validAgents = agents.filter(a => a.user !== null && a.user !== undefined);

    // List view: strip phone for ALL non-admin callers (no owner exception —
    // you're browsing the Agent Bank, not editing your own profile).
    return NextResponse.json({ agents: validAgents.map(a => ({
      ...a,
      languages: safeJson<string[]>(a.languages, []),
      skills: safeJson<string[]>(a.skills, []),
      education: safeJson<string[]>(a.education, []),
      previousEmployers: safeJson<string[]>(a.previousEmployers, []),
      user: a.user ? {
        ...stripPhone({ ...a.user, verificationTiers: safeJson<string[]>(a.user.verificationTiers, []) }, false),
      } : a.user,
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
