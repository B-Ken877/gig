import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;

    const requests = await db.staffingRequest.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        client: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = requests.map((r) => ({
      ...r,
      languages: JSON.parse(r.languages || '[]'),
      startDate: r.startDate?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/staffing-requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch staffing requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      title,
      numberOfAgents,
      languages,
      experienceRequired,
      shift,
      department,
      salaryMin,
      salaryMax,
      startDate,
      specialRequirements,
    } = body;

    if (!clientId || !title || numberOfAgents === undefined) {
      return NextResponse.json(
        { error: 'clientId, title, and numberOfAgents are required' },
        { status: 400 },
      );
    }

    const newRequest = await db.staffingRequest.create({
      data: {
        clientId,
        title,
        numberOfAgents,
        languages: JSON.stringify(languages || []),
        experienceRequired: experienceRequired || 0,
        shift: shift || null,
        department: department || null,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        startDate: startDate ? new Date(startDate) : null,
        specialRequirements: specialRequirements || null,
      },
      include: {
        client: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...newRequest,
        languages: JSON.parse(newRequest.languages || '[]'),
        startDate: newRequest.startDate?.toISOString() || null,
        createdAt: newRequest.createdAt.toISOString(),
        updatedAt: newRequest.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}