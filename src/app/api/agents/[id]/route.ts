import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    // Not valid JSON — return the raw string if the caller expects a string,
    // otherwise fall back to the fallback.
    return (typeof fallback === 'string' ? raw as unknown as T : fallback);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let agent;
    try {
      agent = await db.agent.findUnique({
        where: { id },
        include: { user: { select: { id: true, email: true, name: true, phone: true, avatar: true, role: true, accountStatus: true } }, documents: true, availabilitySlots: true },
      });
    } catch (_) {
      agent = await db.agent.findUnique({ where: { id } });
    }
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json({
      ...agent,
      languages: safeJson<string[]>(agent.languages, []),
      skills: safeJson<string[]>(agent.skills, []),
      previousEmployers: safeJson<string[]>(agent.previousEmployers, []),
      education: safeJson<string[]>(agent.education, []),
      // computerSpecs is a free-text field — keep it as a string.
      computerSpecs: safeJson<string>(agent.computerSpecs, ''),
      dateOfBirth: agent.dateOfBirth?.toISOString() || null,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    // Helper: accept either a Date object, an ISO datetime string, or a YYYY-MM-DD
    // date-only string, and return a Date object suitable for Prisma. Returns
    // null for empty/null/invalid input. Prisma rejects date-only strings with
    // "premature end of input" so we must normalize here.
    const toDate = (v: unknown): Date | null => {
      if (v === null || v === undefined || v === '') return null;
      if (v instanceof Date) return v;
      if (typeof v === 'string') {
        // If it's a date-only string (YYYY-MM-DD), append T00:00:00Z so JS parses it
        // as UTC midnight instead of local time.
        const s = v.length === 10 ? v + 'T00:00:00.000Z' : v;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    if (body.country !== undefined) data.country = body.country || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.dateOfBirth !== undefined) data.dateOfBirth = toDate(body.dateOfBirth);
    if (body.languages !== undefined) data.languages = typeof body.languages === 'string' ? body.languages : JSON.stringify(body.languages);
    // BUG FIX: experience=0 is a valid value (don't coerce to null).
    if (body.experience !== undefined) data.experience = body.experience === null ? null : Number(body.experience) || 0;
    if (body.skills !== undefined) data.skills = typeof body.skills === 'string' ? body.skills : JSON.stringify(body.skills);
    if (body.preferredShift !== undefined) data.preferredShift = body.preferredShift || null;
    if (body.salaryExpectation !== undefined) data.salaryExpectation = body.salaryExpectation === null || body.salaryExpectation === '' ? null : Number(body.salaryExpectation);
    if (body.previousEmployers !== undefined) data.previousEmployers = typeof body.previousEmployers === 'string' ? body.previousEmployers : JSON.stringify(body.previousEmployers);
    if (body.education !== undefined) data.education = typeof body.education === 'string' ? body.education : JSON.stringify(body.education);
    if (body.ram !== undefined) data.ram = body.ram || null;
    if (body.processor !== undefined) data.processor = body.processor || null;
    if (body.internetSpeed !== undefined) data.internetSpeed = body.internetSpeed || null;
    if (body.backupInternet !== undefined) data.backupInternet = Boolean(body.backupInternet);
    if (body.headsetAvailable !== undefined) data.headsetAvailable = Boolean(body.headsetAvailable);
    if (body.upsAvailable !== undefined) data.upsAvailable = Boolean(body.upsAvailable);
    if (body.computerSpecs !== undefined) data.computerSpecs = typeof body.computerSpecs === 'string' ? body.computerSpecs : JSON.stringify(body.computerSpecs);
    if (body.niu !== undefined) data.niu = body.niu || null;

    const agent = await db.agent.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, name: true, phone: true, avatar: true, role: true, accountStatus: true } } },
    });

    return NextResponse.json({
      ...agent,
      languages: safeJson<string[]>(agent.languages, []),
      skills: safeJson<string[]>(agent.skills, []),
      previousEmployers: safeJson<string[]>(agent.previousEmployers, []),
      education: safeJson<string[]>(agent.education, []),
      computerSpecs: safeJson<string>(agent.computerSpecs, ''),
      dateOfBirth: agent.dateOfBirth?.toISOString() || null,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PATCH /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    // Helper: same date normalization as PATCH above.
    const toDate = (v: unknown): Date | null => {
      if (v === null || v === undefined || v === '') return null;
      if (v instanceof Date) return v;
      if (typeof v === 'string') {
        const s = v.length === 10 ? v + 'T00:00:00.000Z' : v;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    // BUG FIX: Now handles ALL Agent model fields that the profile form sends
    if (body.status !== undefined) data.status = body.status;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.languages !== undefined) data.languages = typeof body.languages === 'string' ? body.languages : JSON.stringify(body.languages);
    if (body.experience !== undefined) data.experience = body.experience === null ? null : Number(body.experience) || 0;
    if (body.skills !== undefined) data.skills = typeof body.skills === 'string' ? body.skills : JSON.stringify(body.skills);
    if (body.preferredShift !== undefined) data.preferredShift = body.preferredShift || null;
    if (body.salaryExpectation !== undefined) data.salaryExpectation = body.salaryExpectation === null || body.salaryExpectation === '' ? null : Number(body.salaryExpectation);
    if (body.previousEmployers !== undefined) data.previousEmployers = typeof body.previousEmployers === 'string' ? body.previousEmployers : JSON.stringify(body.previousEmployers);
    if (body.education !== undefined) data.education = typeof body.education === 'string' ? body.education : JSON.stringify(body.education);
    if (body.computerSpecs !== undefined) data.computerSpecs = typeof body.computerSpecs === 'string' ? body.computerSpecs : JSON.stringify(body.computerSpecs);
    if (body.dateOfBirth !== undefined) data.dateOfBirth = toDate(body.dateOfBirth);
    if (body.ram !== undefined) data.ram = body.ram || null;
    if (body.processor !== undefined) data.processor = body.processor || null;
    if (body.internetSpeed !== undefined) data.internetSpeed = body.internetSpeed || null;
    if (body.backupInternet !== undefined) data.backupInternet = Boolean(body.backupInternet);
    if (body.headsetAvailable !== undefined) data.headsetAvailable = Boolean(body.headsetAvailable);
    if (body.upsAvailable !== undefined) data.upsAvailable = Boolean(body.upsAvailable);

    const agent = await db.agent.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, name: true, phone: true, avatar: true, role: true } } },
    });

    // BUG FIX: Update phone on User model if provided (phone lives on User, not Agent)
    if (body.phone !== undefined && agent.userId) {
      await db.user.update({ where: { id: agent.userId }, data: { phone: body.phone } });
    }

    return NextResponse.json({
      ...agent,
      languages: safeJson<string[]>(agent.languages, []),
      skills: safeJson<string[]>(agent.skills, []),
      previousEmployers: safeJson<string[]>(agent.previousEmployers, []),
      education: safeJson<string[]>(agent.education, []),
      computerSpecs: safeJson<string>(agent.computerSpecs, ''),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}