import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = user.password.startsWith('$2')
      ? await import('bcryptjs').then(b => b.compare(password, user.password))
      : password === user.password;

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.accountStatus === 'rejected') {
      return NextResponse.json({ error: 'Your account has been rejected. Please contact support.' }, { status: 403 });
    }

    if (user.accountStatus === 'suspended') {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact support.' }, { status: 403 });
    }

    // Role merge: legacy 'payment_taker' or 'client' rows are treated as 'admin'
    // so the CEO can still log in with an old account.
    const effectiveRole = (user.role === 'payment_taker' || user.role === 'client') ? 'admin' : user.role;

    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name,
        role: effectiveRole, phone: user.phone, avatar: user.avatar,
        isActive: user.isActive, accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
