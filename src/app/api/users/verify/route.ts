import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-middleware';

/**
 * Verification tier values. Must match the VerificationTier union in
 * src/components/ui/verified-badge.tsx.
 *
 * We re-declare here (rather than importing from the component) because
 * importing a client component's exports into a server route can produce
 * tree-shaken references that aren't callable at runtime under Next.js's
 * standalone build. A literal local array is always safe.
 */
type VerificationTier = 'verified' | 'top_rated' | 'trusted_partner' | 'background_checked' | 'elite';

const VERIFICATION_TIERS: VerificationTier[] = [
  'verified',
  'top_rated',
  'trusted_partner',
  'background_checked',
  'elite',
];

const TIER_LABELS: Record<VerificationTier, string> = {
  verified: 'Verified',
  top_rated: 'Top Rated',
  trusted_partner: 'Trusted Partner',
  background_checked: 'Background Checked',
  elite: 'Elite',
};

/**
 * POST /api/users/verify
 * Body: { userId: string, action: 'grant' | 'revoke', tier: VerificationTier }
 *
 * Admin-only endpoint to grant or revoke a verification badge tier on a user.
 * - 'grant' adds the tier to verificationTiers (idempotent) and sets verifiedAt.
 * - 'revoke' removes the tier. If no tiers remain, verifiedAt is cleared.
 *
 * Returns the updated user with the parsed verificationTiers array.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const { userId, action, tier } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!['grant', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'action must be "grant" or "revoke"' }, { status: 400 });
    }
    if (!VERIFICATION_TIERS.includes(tier as VerificationTier)) {
      return NextResponse.json(
        { error: `tier must be one of: ${VERIFICATION_TIERS.join(', ')}` },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, verificationTiers: true, name: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse existing tiers safely
    let current: VerificationTier[] = [];
    try {
      const parsed = JSON.parse(user.verificationTiers || '[]');
      if (Array.isArray(parsed)) {
        current = parsed.filter((t): t is VerificationTier =>
          VERIFICATION_TIERS.includes(t),
        );
      }
    } catch {
      current = [];
    }

    let next: VerificationTier[];
    if (action === 'grant') {
      next = current.includes(tier) ? current : [...current, tier];
    } else {
      next = current.filter((t) => t !== tier);
    }

    // Auth context has the admin's id under a typed header — read it directly
    // (requireRole already verified the request, so we trust the header here)
    const adminId = req.headers.get('X-User-Id') || null;

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        verificationTiers: JSON.stringify(next),
        verifiedAt: next.length > 0 ? new Date() : null,
        verifiedBy: next.length > 0 ? adminId : null,
      },
      select: {
        id: true,
        name: true,
        verificationTiers: true,
        verifiedAt: true,
        verifiedBy: true,
      },
    });

    // Notify the user about the verification change
    const label = TIER_LABELS[tier as VerificationTier] || tier;
    const title =
      action === 'grant'
        ? `You've been verified: ${label}`
        : `Verification removed: ${label}`;
    const message =
      action === 'grant'
        ? `An administrator granted you the "${label}" badge. It's now visible across the platform.`
        : `An administrator removed the "${label}" badge from your profile.`;

    await db.notification.create({
      data: {
        userId: updated.id,
        title,
        message,
        type: 'verification',
        channel: 'in-app',
      },
    }).catch(() => { /* notification failure is non-fatal */ });

    return NextResponse.json({
      message: `Badge ${action === 'grant' ? 'granted' : 'revoked'}`,
      user: {
        ...updated,
        verificationTiers: next,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Forbidden' ? 403 : 401 },
      );
    }
    console.error('POST /api/users/verify error:', error);
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 });
  }
}
