import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// PATCH /api/admin/password-resets/[id] — dismiss a request without generating a link
// Body: { status: 'dismissed' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status?: string };

    if (status !== 'dismissed') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const request = await db.passwordResetRequest.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    await db.passwordResetRequest.update({
      where: { id },
      data: {
        status: 'dismissed',
        resolvedBy: auth.userId,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/admin/password-resets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
