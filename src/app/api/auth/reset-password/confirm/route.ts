import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

// POST /api/auth/reset-password/confirm
// The agent opens the reset link (with ?token=...), enters a new password, and
// submits. This endpoint verifies the token, checks it hasn't expired or been
// used, and updates the user's password.
//
// Body: { token: string, password: string }
//
// The token is hashed (SHA-256) and looked up in the DB by its hash. The raw
// token is never stored anywhere — only its hash.
//
// NOTE: Token verification on page load is handled by the separate
// GET /api/auth/reset-password/verify endpoint. This file only handles the
// POST (final submit).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body as { token?: string; password?: string };

    if (!token || typeof token !== 'string' || token.length < 20) {
      return NextResponse.json({ error: 'Invalid reset link. Please request a new one.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Hash the token (SHA-256) and look up by hash
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'This reset link is invalid. Please request a new one.' }, { status: 400 });
    }
    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'This reset link has already been used. Please request a new one if you still need to reset your password.' }, { status: 400 });
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }
    if (!resetToken.user || !resetToken.user.isActive) {
      return NextResponse.json({ error: 'This account is no longer active. Please contact support.' }, { status: 400 });
    }

    // Hash the new password and update the user
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Mark the token as used (so it can never be reused)
    // Capture the client IP for the audit trail
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor.split(',')[0].trim() || null;
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
        usedFromIp: clientIp,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Your password has been reset. Please log in with your new password.',
    });
  } catch (error) {
    console.error('POST /api/auth/reset-password/confirm error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
