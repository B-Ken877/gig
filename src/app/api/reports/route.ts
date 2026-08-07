import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/reports — admin only. Aggregate platform stats.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const [totalUsers, totalAgents, totalJobs, activeJobs, totalApplications, activePlacements, totalProviders] = await Promise.all([
      db.user.count(),
      db.agent.count(),
      db.jobPost.count(),
      db.jobPost.count({ where: { isActive: true } }),
      db.jobApplication.count(),
      db.placement.count({ where: { status: 'active' } }),
      db.provider.count(),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers, totalAgents, totalJobs, activeJobs,
        totalApplications, activePlacements, totalProviders,
      },
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
