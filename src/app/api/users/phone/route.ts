import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { phone } = body;

    await db.user.update({
      where: { id: auth.userId },
      data: { phone: phone || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/users/phone error:', error);
    return NextResponse.json({ error: 'Failed to update phone' }, { status: 500 });
  }
}
