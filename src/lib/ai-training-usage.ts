// Server-side AI Training usage tracking.
// Enforces: 3 sessions per rolling 24-hour window, per user.
// A "session" = one scenario generation (Practice or Learn mode) OR
// one Live AI Coach connection.

import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import type { NextRequest } from 'next/server';

export const DAILY_LIMIT = 3;
export const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UsageStatus {
  count: number;
  limit: number;
  remaining: number;
  // When the oldest session in the current window expires (user can use another)
  resetAt: string | null;
  // ISO string of the oldest session, or null if no sessions
  oldestSessionAt: string | null;
  canUse: boolean;
  // Milliseconds until the next session is available (0 if canUse)
  waitMs: number;
}

/**
 * Get the current user's AI Training usage status.
 * Reads the X-User-Id header to identify the user.
 * Returns null if not authenticated.
 */
export async function getUsageStatus(req: NextRequest): Promise<UsageStatus | null> {
  const auth = await getAuth(req);
  if ('error' in auth) return null;

  const cutoff = new Date(Date.now() - WINDOW_MS);
  const recentSessions = await db.aiTrainingUsage.findMany({
    where: {
      userId: auth.userId,
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: DAILY_LIMIT,
  });

  const count = recentSessions.length;
  const remaining = Math.max(0, DAILY_LIMIT - count);
  const oldestSessionAt = recentSessions.length > 0 ? recentSessions[0].createdAt : null;

  let resetAt: string | null = null;
  let waitMs = 0;
  let canUse = true;

  if (count >= DAILY_LIMIT && oldestSessionAt) {
    // User has hit the limit. They can use another when the oldest session
    // falls out of the 24-hour window.
    const resetTime = new Date(oldestSessionAt.getTime() + WINDOW_MS);
    resetAt = resetTime.toISOString();
    waitMs = Math.max(0, resetTime.getTime() - Date.now());
    canUse = false;
  }

  return {
    count,
    limit: DAILY_LIMIT,
    remaining,
    resetAt,
    oldestSessionAt: oldestSessionAt ? oldestSessionAt.toISOString() : null,
    canUse,
    waitMs,
  };
}

/**
 * Record a new AI Training session for the current user.
 * Should be called when a session actually starts (scenario generated,
 * or Live AI Coach connects).
 * Returns the updated usage status after recording.
 */
export async function recordSession(req: NextRequest): Promise<UsageStatus | null> {
  const auth = await getAuth(req);
  if ('error' in auth) return null;

  await db.aiTrainingUsage.create({
    data: { userId: auth.userId },
  });

  // Re-fetch to get the updated count
  const cutoff = new Date(Date.now() - WINDOW_MS);
  const recentSessions = await db.aiTrainingUsage.findMany({
    where: {
      userId: auth.userId,
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: DAILY_LIMIT + 1, // take one extra to detect over-limit
  });

  const count = Math.min(recentSessions.length, DAILY_LIMIT);
  const remaining = Math.max(0, DAILY_LIMIT - count);
  const oldestSessionAt = recentSessions.length > 0 ? recentSessions[0].createdAt : null;

  let resetAt: string | null = null;
  let waitMs = 0;
  let canUse = count < DAILY_LIMIT;

  if (!canUse && oldestSessionAt) {
    const resetTime = new Date(oldestSessionAt.getTime() + WINDOW_MS);
    resetAt = resetTime.toISOString();
    waitMs = Math.max(0, resetTime.getTime() - Date.now());
  }

  return {
    count,
    limit: DAILY_LIMIT,
    remaining,
    resetAt,
    oldestSessionAt: oldestSessionAt ? oldestSessionAt.toISOString() : null,
    canUse,
    waitMs,
  };
}

/**
 * Check if the user can start a new session. Throws an error with
 * status 429 if the limit has been reached. Returns the usage status
 * otherwise.
 */
export async function assertCanUse(req: NextRequest): Promise<UsageStatus> {
  const status = await getUsageStatus(req);
  if (!status) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  if (!status.canUse) {
    throw Object.assign(
      new Error(
        JSON.stringify({
          error: 'Daily limit reached',
          limit: status.limit,
          resetAt: status.resetAt,
          waitMs: status.waitMs,
          remaining: 0,
        }),
      ),
      { status: 429 },
    );
  }
  return status;
}
