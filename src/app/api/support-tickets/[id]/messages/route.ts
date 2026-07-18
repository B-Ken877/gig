import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    // Only the ticket owner, assigned support agent, or admin can read messages
    const isOwner = ticket.userId === auth.userId;
    const isAssigned = ticket.assignedTo === auth.userId;
    const isAdmin = auth.role === 'admin';
    if (!isOwner && !isAssigned && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await db.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET ticket messages error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    // Only the ticket owner, assigned support agent, or admin can send messages
    const isOwner = ticket.userId === auth.userId;
    const isAssigned = ticket.assignedTo === auth.userId;
    const isAdmin = auth.role === 'admin';
    if (!isOwner && !isAssigned && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const message = await db.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: auth.userId,
        senderRole: auth.role,
        content: content.trim(),
      },
    });

    // Notify the other party
    if (isOwner && ticket.assignedTo) {
      // User sent message -> notify support agent
      await createNotification({
        userId: ticket.assignedTo,
        title: 'New reply on ticket: ' + ticket.subject,
        message: content.trim().slice(0, 100),
        type: 'support_ticket',
        pushBody: content.trim().slice(0, 100),
        pushUrl: 'https://167.86.124.101:4001/#tickets',
      });
    } else if (isAssigned && ticket.userId) {
      // Support agent replied -> notify user
      await createNotification({
        userId: ticket.userId,
        title: 'Support reply on: ' + ticket.subject,
        message: content.trim().slice(0, 100),
        type: 'support_ticket',
        pushBody: 'Support Agent replied to your ticket',
        pushUrl: 'https://167.86.124.101:4001/#support',
      });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST ticket message error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
