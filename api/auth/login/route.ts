import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Normalize the email: trim whitespace + lowercase. SQLite's findUnique
    // is case-sensitive on email, so without this, users who type
    // "Payments@..." or "PAYMENTS@..." get "Invalid credentials" even with
    // the correct password. This is the most common cause of "my credentials
    // don't work" reports.
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

    // Allow pending_approval users to log in (they need to access payment chat)
    // Parse verificationTiers JSON string into an array for the client.
    let verificationTiers: string[] = [];
    try {
      const parsed = JSON.parse(user.verificationTiers || '[]');
      if (Array.isArray(parsed)) verificationTiers = parsed.filter((t) => typeof t === 'string');
    } catch { /* leave empty */ }
    // ROLE MERGE: payment_taker is now treated as admin — one session, full access.
    // The DB may still hold 'payment_taker' for legacy rows; we normalize at login
    // so the UI never has to special-case it.
    const effectiveRole = user.role === 'payment_taker' ? 'admin' : user.role;
    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name,
        role: effectiveRole, phone: user.phone, avatar: user.avatar,
        isActive: user.isActive, accountStatus: user.accountStatus,
        verificationTiers,
        verifiedAt: user.verifiedAt ? user.verifiedAt.toISOString() : null,
        gigScore: user.gigScore || 0,
        // Payment gating fields — drive the agent apply gate and the
        // call center "Job Links" gate. `paidUntil` is null when the
        // user has never paid; an expired subscription shows up as
        // paidUntil < now, which the client treats the same as unpaid.
        paid: !!user.paid,
        paidUntil: user.paidUntil ? user.paidUntil.toISOString() : null,
        paymentTier: user.paymentTier || null,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}