import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/job-posts/[id] — public. Returns a single active job for the
// shareable career-page URL. Provider info is NEVER returned.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await db.jobPost.findUnique({ where: { id } });
    if (!post || !post.isActive) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json({
      jobPost: {
        id: post.id,
        jobTitle: post.jobTitle,
        description: post.description,
        skills: JSON.parse(post.skills || '[]'),
        requirements: JSON.parse(post.requirements || '[]'),
        hourlyRate: post.hourlyRate,
        payFrequency: post.payFrequency,
        category: post.category,
        shift: post.shift,
        location: post.location,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/job-posts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch job post' }, { status: 500 });
  }
}
