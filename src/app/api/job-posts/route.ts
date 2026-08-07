import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotificationBulk } from '@/lib/notifications';

// GET /api/job-posts
// Public — anyone (including logged-out visitors on the career page) can list
// active jobs. Provider info is NEVER returned to the client.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === '1';

    const posts = await db.jobPost.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true, placements: true } } },
    });

    const cleaned = posts.map(p => ({
      id: p.id,
      jobTitle: p.jobTitle,
      description: p.description,
      skills: JSON.parse(p.skills || '[]'),
      requirements: JSON.parse(p.requirements || '[]'),
      hourlyRate: p.hourlyRate,
      payFrequency: p.payFrequency,
      category: p.category,
      shift: p.shift,
      location: p.location,
      commission: p.commission,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
    }));

    return NextResponse.json({ jobPosts: cleaned });
  } catch (error) {
    console.error('GET /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch job posts' }, { status: 500 });
  }
}

// GET single job by id — used by the shareable career page URL.
export async function GET_ONE(id: string) {
  const post = await db.jobPost.findUnique({ where: { id } });
  if (!post || !post.isActive) return null;
  return {
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
  };
}

// POST /api/job-posts — admin only. Creates a new job.
// Provider info + commission are stored internally but never exposed publicly.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const {
      jobTitle, description, skills, requirements,
      hourlyRate, payFrequency, category, shift, location,
      providerId, commission,
    } = body;

    if (!jobTitle || !description) {
      return NextResponse.json({ error: 'Job title and description are required' }, { status: 400 });
    }

    const post = await db.jobPost.create({
      data: {
        jobTitle,
        description,
        skills: JSON.stringify(skills || []),
        requirements: JSON.stringify(requirements || []),
        hourlyRate: Number(hourlyRate) || 0,
        payFrequency: payFrequency || 'bi-weekly',
        category: category || null,
        shift: shift || null,
        location: location || 'Remote',
        providerId: providerId || null,
        commission: Number(commission) || 0,
        isActive: true,
      },
    });

    // Notify all active agents about the new job post.
    try {
      const agents = await db.user.findMany({
        where: { role: 'agent', isActive: true },
        select: { id: true },
      });
      if (agents.length > 0) {
        await createNotificationBulk(agents.map(a => a.id), {
          title: 'New Job Posted',
          message: 'A new job "' + jobTitle + '" is now available. Apply from your dashboard.',
          type: 'job_post',
          pushBody: 'New job: ' + jobTitle,
          pushUrl: 'https://167.86.124.101:4001/#agent-dashboard',
        });
      }
    } catch (notifErr) {
      console.error('[job-posts POST] agent notification failed:', notifErr);
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
        commission: post.commission,
        isActive: post.isActive,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to create job post' }, { status: 500 });
  }
}

// PATCH /api/job-posts?id=... — admin only. Toggle active / edit fields.
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.jobTitle !== undefined) data.jobTitle = body.jobTitle;
    if (body.description !== undefined) data.description = body.description;
    if (body.skills !== undefined) data.skills = JSON.stringify(body.skills);
    if (body.requirements !== undefined) data.requirements = JSON.stringify(body.requirements);
    if (body.hourlyRate !== undefined) data.hourlyRate = Number(body.hourlyRate);
    if (body.payFrequency !== undefined) data.payFrequency = body.payFrequency;
    if (body.category !== undefined) data.category = body.category;
    if (body.shift !== undefined) data.shift = body.shift;
    if (body.location !== undefined) data.location = body.location;
    if (body.providerId !== undefined) data.providerId = body.providerId || null;
    if (body.commission !== undefined) data.commission = Number(body.commission) || 0;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const updated = await db.jobPost.update({ where: { id }, data });
    return NextResponse.json({ jobPost: { id: updated.id, isActive: updated.isActive } });
  } catch (error) {
    console.error('PATCH /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to update job post' }, { status: 500 });
  }
}

// DELETE /api/job-posts?id=... — admin only. Soft-delete (deactivate).
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.jobPost.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to delete job post' }, { status: 500 });
  }
}
