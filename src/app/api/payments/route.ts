import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (type) {
      where.type = type;
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        client: { include: { user: true } },
        agent: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedPayments = payments.map((payment) => ({
      ...payment,
      dueDate: payment.dueDate ? payment.dueDate.toISOString() : null,
      paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
    }));

    return NextResponse.json({ payments: parsedPayments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      agentId,
      amount,
      method,
      type,
      status,
      dueDate,
      paidDate,
      description,
      invoiceNumber,
    } = body;

    if (!clientId || amount === undefined || !method || !type) {
      return NextResponse.json({ error: 'clientId, amount, method, and type are required' }, { status: 400 });
    }

    const payment = await db.payment.create({
      data: {
        clientId,
        agentId: agentId || null,
        amount,
        method,
        type,
        status: status || 'Pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        paidDate: paidDate ? new Date(paidDate) : null,
        description: description || null,
        invoiceNumber: invoiceNumber || null,
      },
      include: {
        client: { include: { user: true } },
        agent: { include: { user: true } },
      },
    });

    return NextResponse.json({
      ...payment,
      dueDate: payment.dueDate ? payment.dueDate.toISOString() : null,
      paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}