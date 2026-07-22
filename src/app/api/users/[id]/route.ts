import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getAuth } from '@/lib/auth-middleware';

// GET /api/users/[id] — Get a single user (any authenticated user can fetch).
// PRIVACY POLICY: Only admin sees phone numbers. Password hash is NEVER
// exposed to anyone (not even admin — admins use /api/users for edits).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: { agent: true, client: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Always strip the password hash — no one should ever see it.
    // Phone is only visible to admins (platform privacy policy).
    const { password, ...userWithoutPassword } = user as any;
    if (isAdmin) {
      // Admin sees everything (phone included) except the password hash.
      return NextResponse.json({ user: userWithoutPassword });
    }
    // Non-admin: strip phone from User and Client.
    const { phone, ...userWithoutPhone } = userWithoutPassword;
    if (userWithoutPhone.client) {
      const { phone: _clientPhone, ...clientWithoutPhone } = userWithoutPhone.client;
      userWithoutPhone.client = clientWithoutPhone as any;
    }
    return NextResponse.json({ user: userWithoutPhone });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH /api/users/[id] — Update a user (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['admin']);
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, role, isActive, accountStatus } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (accountStatus !== undefined) updateData.accountStatus = accountStatus;

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — Delete a user (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting their own account
    if (id === auth.userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Prevent deletion of other admin accounts (safety measure)
    if (existing.role === 'admin') {
      return NextResponse.json({ error: 'Admin accounts cannot be deleted. Use suspend instead.' }, { status: 403 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
