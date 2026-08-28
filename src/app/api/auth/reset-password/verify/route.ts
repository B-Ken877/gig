import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

// GET /api/auth/reset-password/verify?token=...
// Called by the reset page on load to verify the token is still valid and to
// fetch the user's name/email (so we can show "Reset password for <name> <email>"
// on the form). This endpoint does NOT consume the token — only the confirm
// POST does that.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || token.length < 20) {
      return NextResponse.json({ valid: false, error: 'Invalid reset link.' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
    });

    if (!resetToken) {
      return NextResponse.json({ valid: false, error: 'This reset link is invalid.' });
    }
    if (resetToken.usedAt) {
      return NextResponse.json({ valid: false, error: 'This reset link has already been used.' });
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'This reset link has expired.' });
    }
    if (!resetToken.user || !resetToken.user.isActive) {
      return NextResponse.json({ valid: false, error: 'This account is no longer active.' });
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: resetToken.user.name,
        email: resetToken.user.email,
      },
      expiresAt: resetToken.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/auth/reset-password/verify error:', error);
    return NextResponse.json({ valid: false, error: 'Failed to verify token.' }, { status: 500 });
  }
}
