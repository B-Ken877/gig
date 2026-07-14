import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.isRead !== undefined) data.isRead = Boolean(body.isRead);
    if (body.title !== undefined) data.title = body.title;
    if (body.message !== undefined) data.message = body.message;
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.type !== undefined) data.type = body.type || null;

    const notification = await db.notification.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/notifications/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notifications/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}