import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
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

    // Allow pending_approval users to log in (they need to access payment chat)
    // Parse verificationTiers JSON string into an array for the client.
    let verificationTiers: string[] = [];
    try {
      const parsed = JSON.parse(user.verificationTiers || '[]');
      if (Array.isArray(parsed)) verificationTiers = parsed.filter((t) => typeof t === 'string');
    } catch { /* leave empty */ }
    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, phone: user.phone, avatar: user.avatar,
        isActive: user.isActive, accountStatus: user.accountStatus,
        verificationTiers,
        gigScore: user.gigScore || 0,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}