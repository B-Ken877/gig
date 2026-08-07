import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/users — admin only. Lists all users.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const effectiveRole = auth.role === 'payment_taker' || auth.role === 'client' ? 'admin' : auth.role;
    if (effectiveRole !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const users = await db.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        avatar: true, isActive: true, accountStatus: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone,
        avatar: u.avatar, isActive: u.isActive, accountStatus: u.accountStatus,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH /api/users — admin only. Update a user (isActive, accountStatus, role, name, phone).
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    // Whitelist allowed fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = !!data.isActive;
    if (data.accountStatus !== undefined) updateData.accountStatus = data.accountStatus;

    const user = await db.user.update({ where: { id }, data: updateData });
    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        isActive: user.isActive, accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error('PATCH /api/users error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
