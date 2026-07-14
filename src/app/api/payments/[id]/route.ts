import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        agent: { include: { user: true } },
      },
    });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...payment,
      dueDate: payment.dueDate ? payment.dueDate.toISOString() : null,
      paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowed = ['status', 'method', 'amount', 'description', 'invoiceNumber'];

    for (const field of allowed) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.paidDate !== undefined) {
      updateData.paidDate = body.paidDate ? new Date(body.paidDate) : null;
    }

    const updated = await db.payment.update({
      where: { id },
      data: updateData,
      include: {
        client: { include: { user: true } },
        agent: { include: { user: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
      paidDate: updated.paidDate ? updated.paidDate.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}