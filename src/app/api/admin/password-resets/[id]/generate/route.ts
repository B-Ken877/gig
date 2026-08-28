import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { randomBytes, createHash } from 'crypto';

// POST /api/admin/password-resets/[id]/generate
// Admin reviews a pending password reset request and decides to generate a
// reset link. This:
//   1. Validates the request exists and is pending.
//   2. Validates the user still exists and is active.
//   3. Generates a 32-byte cryptographic random token.
//   4. Stores ONLY the SHA-256 hash of the token in the DB.
//   5. Marks the original request as 'link_generated' + resolvedBy = admin.
//   6. Returns the full reset URL to the admin (who copies it and emails it
//      to the agent manually).
//
// Returns: { url: 'https://gigsolutions.app/#reset-password?token=...',
//            expiresAt: ISO string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;

    // Look up the request
    const request = await db.passwordResetRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (!request.user) {
      return NextResponse.json({ error: 'No account exists for this email address. You can dismiss this request.' }, { status: 400 });
    }
    if (!request.user.isActive) {
      return NextResponse.json({ error: 'This account is no longer active. Cannot generate a reset link.' }, { status: 400 });
    }

    // Generate a 32-byte random token (base64url, ~43 chars)
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Create the token row (hashed only — never the raw token)
    await db.passwordResetToken.create({
      data: {
        userId: request.user.id,
        tokenHash,
        expiresAt,
        createdBy: auth.userId,
        requestId: request.id,
      },
    });

    // Mark the request as 'link_generated' + resolvedBy admin
    await db.passwordResetRequest.update({
      where: { id: request.id },
      data: {
        status: 'link_generated',
        resolvedBy: auth.userId,
        resolvedAt: new Date(),
      },
    });

    // Build the URL — uses the hash route so it works without a server roundtrip
    const origin = req.headers.get('origin') || 'https://gigsolutions.app';
    const url = `${origin}/#reset-password?token=${rawToken}`;

    return NextResponse.json({
      url,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/password-resets/[id]/generate error:', error);
    return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
  }
}
