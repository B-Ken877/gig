#!/usr/bin/env python3
"""Fix the DELETE route directly — the comment is slightly different."""

filepath = '/root/gig-src/src/app/api/job-posts/route.ts'
with open(filepath, 'r') as f:
    c = f.read()

old = """// DELETE /api/job-posts?id=... — admin only.
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
}"""

new = """// DELETE /api/job-posts?id=...&permanent=true — admin only.
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
}"""

if old in c:
    c = c.replace(old, new)
    print("FIXED: DELETE route now supports permanent=true")
else:
    print("Pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
