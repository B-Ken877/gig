// AI Training usage — check (GET) and record (POST) sessions.
// Enforces 3 sessions per rolling 24-hour window per user.

import { NextRequest, NextResponse } from 'next/server';
import { getUsageStatus, recordSession } from '@/lib/ai-training-usage';

export async function GET(req: NextRequest) {
  try {
    const status = await getUsageStatus(req);
    if (!status) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('GET /api/ai-training/usage error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch usage' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check first — don't record if over limit
    const current = await getUsageStatus(req);
    if (!current) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    if (!current.canUse) {
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          limit: current.limit,
          resetAt: current.resetAt,
          waitMs: current.waitMs,
          remaining: 0,
        },
        { status: 429 },
      );
    }

    const updated = await recordSession(req);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('POST /api/ai-training/usage error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record session' },
      { status: 500 },
    );
  }
}
