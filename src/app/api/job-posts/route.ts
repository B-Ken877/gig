import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotificationBulk } from '@/lib/notifications';

// GET /api/job-posts — public (active jobs only). Admin can pass ?all=1.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === '1';

    let isAdmin = false;
    try {
      const auth = await getAuth(req);
      if (!('error' in auth) && auth.role === 'admin') isAdmin = true;
    } catch { /* public */ }

    const posts = await db.jobPost.findMany({
      where: includeInactive && isAdmin ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true, placements: true } } },
    });

    const cleaned = posts.map(p => {
      const base: Record<string, unknown> = {
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
        assessmentQuestions: JSON.parse(p.assessmentQuestions || '[]'),
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        _count: p._count,
      };
      if (isAdmin) {
        base.commission = p.commission;
        base.providerId = p.providerId;
      }
      return base;
    });

    return NextResponse.json({ jobPosts: cleaned });
  } catch (error) {
    console.error('GET /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch job posts' }, { status: 500 });
  }
}

// POST /api/job-posts — admin only.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const {
      jobTitle, description, skills, requirements,
      hourlyRate, payFrequency, category, shift, location,
      providerId, commission, assessmentQuestions,
    } = body;

    if (!jobTitle || !description) {
      return NextResponse.json({ error: 'Job title and description are required' }, { status: 400 });
    }

    // Validate assessment questions — must be exactly 5 non-empty strings.
    const questions = Array.isArray(assessmentQuestions) ? assessmentQuestions.filter((q: string) => q && q.trim()) : [];
    if (questions.length !== 5) {
      return NextResponse.json({ error: 'Exactly 5 assessment questions are required' }, { status: 400 });
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
        assessmentQuestions: JSON.stringify(questions),
        isActive: true,
      },
    });

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
        });
      }
    } catch (notifErr) {
      console.error('[job-posts POST] agent notification failed:', notifErr);
    }

    return NextResponse.json({
      jobPost: {
        id: post.id,
        jobTitle: post.jobTitle,
        assessmentQuestions: JSON.parse(post.assessmentQuestions || '[]'),
        isActive: post.isActive,
        createdAt: post.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to create job post' }, { status: 500 });
  }
}

// PATCH /api/job-posts?id=... — admin only.
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
    if (body.assessmentQuestions !== undefined) {
      const qs = Array.isArray(body.assessmentQuestions) ? body.assessmentQuestions.filter((q: string) => q && q.trim()) : [];
      if (qs.length !== 5) {
        return NextResponse.json({ error: 'Exactly 5 assessment questions are required' }, { status: 400 });
      }
      data.assessmentQuestions = JSON.stringify(qs);
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const updated = await db.jobPost.update({ where: { id }, data });
    return NextResponse.json({ jobPost: { id: updated.id, isActive: updated.isActive } });
  } catch (error) {
    console.error('PATCH /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to update job post' }, { status: 500 });
  }
}

// DELETE /api/job-posts?id=...&permanent=true — admin only.
// Without permanent=true: soft-delete (deactivate).
// With permanent=true: permanently delete the job and all related data.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (permanent) {
      // Permanently delete: remove related data first, then the job.
      const apps = await db.jobApplication.findMany({ where: { jobPostId: id }, select: { id: true } });
      if (apps.length > 0) {
        await db.videoResponse.deleteMany({ where: { applicationId: { in: apps.map(a => a.id) } } });
      }
      await db.jobApplication.deleteMany({ where: { jobPostId: id } });
      await db.placement.deleteMany({ where: { jobPostId: id } });
      await db.salaryDate.deleteMany({ where: { jobPostId: id } });
      await db.jobPost.delete({ where: { id } });
    } else {
      // Soft-delete (deactivate)
      await db.jobPost.update({ where: { id }, data: { isActive: false } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to delete job post' }, { status: 500 });
  }
}
