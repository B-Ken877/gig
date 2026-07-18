import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotificationBulk } from '@/lib/notifications';

function parseRequirements(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.flatMap(item =>
        String(item).split(',').map(s => s.trim()).filter(Boolean)
      );
    }
    return String(parsed).split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Optional filter: when a call center opens their "My Staffing Needs"
    // page, they should only see THEIR own needs — not every other call
    // center's. Pass ?userId=<their-user-id> to filter.
    // When omitted (e.g. agents browsing the public listing), all active
    // needs are returned.
    const userId = searchParams.get('userId');

    const needs = await db.callCenterNeed.findMany({
      where: {
        isActive: true,
        // When userId is provided, scope to that user's client record.
        ...(userId ? { client: { userId } } : {}),
      },
      // Include the client's user.avatar so agents see the call center's
      // profile picture alongside the need.
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            companyLink: true,
            user: { select: { id: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      needs: needs.map(n => ({
        ...n,
        requirements: parseRequirements(n.requirements),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const { userId } = auth;
    const client = await db.client.findUnique({ where: { userId } });
    if (!client) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });

    const body = await req.json();
    const { title, description, requirements } = body;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const need = await db.callCenterNeed.create({
      data: {
        clientId: client.id,
        title,
        description: description || '',
        requirements: JSON.stringify(requirements || []),
      },
    });

    // Notify all agents about new staffing need (in-app + push)
    try {
      const agents = await db.user.findMany({
        where: { role: 'agent', isActive: true },
        select: { id: true },
      });
      if (agents.length > 0) {
        await createNotificationBulk(agents.map(a => a.id), {
          title: 'New Staffing Need',
          message: client.companyName + ' posted a new need: "' + title + '"',
          type: 'need',
          pushBody: client.companyName + ' needs staff: ' + title,
          pushUrl: 'https://167.86.124.101:4001/#agent-dashboard',
        });
      }
    } catch (notifErr) {
      console.error('[call-center-needs POST] notification failed:', notifErr);
    }

    return NextResponse.json({
      need: {
        ...need,
        requirements: parseRequirements(need.requirements),
        createdAt: need.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client' && auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.callCenterNeed.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/call-center-needs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
