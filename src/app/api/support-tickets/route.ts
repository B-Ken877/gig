import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (auth.role === 'payment_taker' || auth.role === 'admin') {
      if (status) where.status = status;
    } else {
      where.userId = auth.userId;
      if (status) where.status = status;
    }

    const tickets = await db.supportTicket.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      tickets: tickets.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/support-tickets error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { subject, description } = body;
    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const supportAgent = await db.user.findFirst({
      where: { role: 'payment_taker', isActive: true },
      select: { id: true },
    });

    const ticket = await db.supportTicket.create({
      data: {
        userId: auth.userId,
        subject,
        description,
        assignedTo: supportAgent?.id || null,
      },
    });

    if (supportAgent) {
      await createNotification(supportAgent.id, {
        title: 'New Support Ticket',
        message: 'A new ticket: "' + subject + '"',
        type: 'support_ticket',
        pushBody: 'New ticket from ' + (auth.userId || 'a user') + ': ' + subject,
        pushUrl: 'https://167.86.124.101:4001/#tickets',
      });
    }

    return NextResponse.json({
      ticket: { ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/support-tickets error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'payment_taker' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Support agent only' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status) data.status = status;

    const ticket = await db.supportTicket.update({ where: { id }, data });

    if (status === 'closed') {
      await createNotification(ticket.userId, {
        title: 'Ticket Closed',
        message: 'Your ticket "' + ticket.subject + '" has been resolved.',
        type: 'support_ticket',
        pushBody: 'Your ticket has been resolved',
        pushUrl: 'https://167.86.124.101:4001/#support',
      });
    }

    return NextResponse.json({ ticket: { ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() } });
  } catch (error) {
    console.error('PUT /api/support-tickets error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
