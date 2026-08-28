import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/notifications — returns notifications for the authenticated user.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = { userId: auth.userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const parsed = notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json({ notifications: parsed });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications — DELETE ALL notifications for the authenticated user.
// The user requested that "Mark all as read" actually removes all notifications
// from the bell tab entirely (not just marks them as read).
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.notification.deleteMany({
      where: { userId: auth.userId },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}

// DELETE /api/notifications — delete a single notification by id (in body).
// Used when the user clicks on a notification — it's removed from the bell.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Notification id required' }, { status: 400 });

    // Make sure the notification belongs to the authenticated user (security).
    const notif = await db.notification.findUnique({ where: { id } });
    if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (notif.userId !== auth.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

// POST /api/notifications — create a notification (admin/system use).
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { userId, channel, title, message, type } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'userId, title, and message are required' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        channel: channel || 'in-app',
        title,
        message,
        type: type || null,
      },
    });

    return NextResponse.json({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
