import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let agent;
    try {
      agent = await db.agent.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, name: true, phone: true, avatar: true, role: true, accountStatus: true } },
          documents: true,
          availabilitySlots: true,
        },
      });
    } catch (_) {
      agent = await db.agent.findUnique({ where: { id } });
    }
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json({
      ...agent,
      languages: JSON.parse(agent.languages || '[]'),
      skills: JSON.parse(agent.skills || '[]'),
      previousEmployers: JSON.parse(agent.previousEmployers || '[]'),
      education: JSON.parse(agent.education || '[]'),
      computerSpecs: JSON.parse(agent.computerSpecs || '{}'),
      dateOfBirth: agent.dateOfBirth?.toISOString() || null,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.languages !== undefined) data.languages = typeof body.languages === 'string' ? body.languages : JSON.stringify(body.languages);
    if (body.experience !== undefined) data.experience = body.experience;
    if (body.skills !== undefined) data.skills = typeof body.skills === 'string' ? body.skills : JSON.stringify(body.skills);
    if (body.preferredShift !== undefined) data.preferredShift = body.preferredShift || null;
    if (body.salaryExpectation !== undefined) data.salaryExpectation = body.salaryExpectation || null;
    const agent = await db.agent.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, name: true, phone: true, avatar: true, role: true } } },
    });
    return NextResponse.json({
      ...agent,
      languages: JSON.parse(agent.languages || '[]'),
      skills: JSON.parse(agent.skills || '[]'),
      previousEmployers: JSON.parse(agent.previousEmployers || '[]'),
      education: JSON.parse(agent.education || '[]'),
      computerSpecs: JSON.parse(agent.computerSpecs || '{}'),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
