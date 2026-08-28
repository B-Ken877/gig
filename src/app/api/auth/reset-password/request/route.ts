import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/auth/reset-password/request
// An agent (or any user) clicks "Forgot password?" on the login page and submits
// their email. This creates a PasswordResetRequest row in the DB for the admin
// to review. It does NOT send any email, does NOT verify the email exists, and
// does NOT change any account state.
//
// The response is always the same generic message, so attackers can't enumerate
// accounts by seeing different responses for existing vs. non-existing emails.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up the user by email. We don't tell the agent whether or not we found one.
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isActive: true },
    });

    // Create the reset request row. If the user doesn't exist, we still create a
    // row with userId=null — so the admin sees the request and can decide what to
    // do (e.g., reply "no account with that email" or ignore).
    await db.passwordResetRequest.create({
      data: {
        email: normalizedEmail,
        userId: user?.id || null,
        status: 'pending',
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Your request has been received. Our team will review it and email you a reset link shortly.',
    });
  } catch (error) {
    console.error('POST /api/auth/reset-password/request error:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
