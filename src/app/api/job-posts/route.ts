import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const posts = await db.jobPost.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ jobPosts: posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) });
  } catch (error) {
    console.error('GET /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch job posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { companyName, companyLink, jobTitle, description, clientId } = body;
    if (!companyName || !jobTitle || !description) {
      return NextResponse.json({ error: 'Company name, job title, and description are required' }, { status: 400 });
    }

    const data: Record<string, unknown> = { companyName, jobTitle, description };
    if (companyLink) data.companyLink = companyLink;
    if (clientId) data.clientId = clientId;

    const post = await db.jobPost.create({ data: data as any });
    return NextResponse.json({ jobPost: { ...post, createdAt: post.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/job-posts error:', error);
    return NextResponse.json({ error: 'Failed to create job post' }, { status: 500 });
  }
}

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
