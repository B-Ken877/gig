import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

/**
 * GET /api/agents/gig-score?userId=<...>
 *
 * Computes and returns the agent's Gig Score (0-100) based on:
 *  - Profile completeness (max 35 points)
 *  - Experience (max 15 points)
 *  - Skills + languages breadth (max 15 points)
 *  - Technical readiness (max 15 points: RAM/CPU/internet/headset/UPS/backup)
 *  - Documents uploaded (max 10 points)
 *  - Verification badges (max 10 points — admin-granted tiers add bonus)
 *
 * The score is also written back to User.gigScore so it can be cached and
 * surfaced in the agent bank without recomputing per request.
 *
 * Returns: { score: number, breakdown: { ... }, tier: string }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        verificationTiers: true,
        agent: {
          include: {
            documents: { select: { id: true } },
            placements: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!user || !user.agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const a = user.agent;

    // Parse JSON-stringified fields safely
    function safeParse<T>(raw: string | null, fallback: T): T {
      if (!raw) return fallback;
      try {
        const v = JSON.parse(raw);
        return (Array.isArray(v) ? v : fallback) as T;
      } catch {
        return fallback;
      }
    }
    const languages = safeParse<string[]>(a.languages, []);
    const skills = safeParse<string[]>(a.skills, []);
    const education = safeParse<string[]>(a.education, []);
    const previousEmployers = safeParse<string[]>(a.previousEmployers, []);

    let breakdown = 0;
    const parts: Record<string, number> = {};

    // 1) Profile completeness (max 35)
    let completeness = 0;
    if (a.country) completeness += 5;
    if (a.address) completeness += 3;
    if (a.dateOfBirth) completeness += 2;
    if (languages.length > 0) completeness += 4;
    if (languages.length >= 2) completeness += 2; // bilingual bonus
    if (skills.length > 0) completeness += 4;
    if (skills.length >= 3) completeness += 2;
    if (education.length > 0) completeness += 3;
    if (previousEmployers.length > 0) completeness += 3;
    if (a.preferredShift) completeness += 3;
    if (a.salaryExpectation && a.salaryExpectation > 0) completeness += 2;
    if (user.role === 'agent' && a.status === 'Available') completeness += 2;
    parts.completeness = Math.min(completeness, 35);
    breakdown += parts.completeness;

    // 2) Experience (max 15) — 2 pts per year, cap 15
    parts.experience = Math.min((a.experience || 0) * 2, 15);
    breakdown += parts.experience;

    // 3) Skills + languages breadth (max 15) — 1 pt per skill (cap 8) + 1 pt per language (cap 7)
    parts.skillsLanguages = Math.min(skills.length, 8) + Math.min(languages.length, 7);
    breakdown += parts.skillsLanguages;

    // 4) Technical readiness (max 15)
    let tech = 0;
    if (a.ram) tech += 2;
    if (a.processor) tech += 2;
    if (a.internetSpeed) tech += 3;
    if (a.backupInternet) tech += 2;
    if (a.headsetAvailable) tech += 3;
    if (a.upsAvailable) tech += 3;
    parts.technical = Math.min(tech, 15);
    breakdown += parts.technical;

    // 5) Documents uploaded (max 10) — 2 pts per doc, cap 10
    parts.documents = Math.min((a.documents?.length || 0) * 2, 10);
    breakdown += parts.documents;

    // 6) Verification badges (max 10)
    let verification = 0;
    let tiers: string[] = [];
    try {
      const parsed = JSON.parse(user.verificationTiers || '[]');
      if (Array.isArray(parsed)) tiers = parsed.filter((t) => typeof t === 'string');
    } catch { /* empty */ }
    // Each tier is worth 2 pts up to 10
    verification = Math.min(tiers.length * 3, 10);
    parts.verification = verification;
    breakdown += parts.verification;

    // Bonus: successful placements (max 5, doesn't push over 100)
    const successfulPlacements = (a.placements || []).filter((p) => p.status === 'Active' || p.status === 'Completed').length;
    parts.placements = Math.min(successfulPlacements, 5);
    breakdown += parts.placements;

    const score = Math.max(0, Math.min(100, Math.round(breakdown)));

    // Tier label for UI coloring (mirrors GigScoreRing colors)
    let tier = 'low';
    if (score >= 90) tier = 'elite';
    else if (score >= 75) tier = 'high';
    else if (score >= 50) tier = 'good';
    else if (score >= 30) tier = 'mid';
    else tier = 'low';

    // Persist to cache column (non-fatal if it fails)
    try {
      await db.user.update({
        where: { id: user.id },
        data: { gigScore: score, gigScoreUpdatedAt: new Date() },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      score,
      tier,
      breakdown: parts,
      verificationTiers: tiers,
    });
  } catch (error) {
    console.error('GET /api/agents/gig-score error:', error);
    return NextResponse.json({ error: 'Failed to compute gig score' }, { status: 500 });
  }
}
