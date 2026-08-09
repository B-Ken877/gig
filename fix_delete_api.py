#!/usr/bin/env python3
"""Update the job-posts DELETE route to support permanent deletion."""

filepath = '/root/gig-src/src/app/api/job-posts/route.ts'
with open(filepath, 'r') as f:
    c = f.read()

old_delete = """// DELETE /api/job-posts?id=... — admin only. Soft-delete (deactivate).
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

new_delete = """// DELETE /api/job-posts?id=...&permanent=true — admin only.
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
      // Permanently delete the job and all related data.
      // Order matters: delete children first to avoid foreign key constraint errors.
      // 1. Delete VideoResponses (via JobApplication)
      const apps = await db.jobApplication.findMany({ where: { jobPostId: id }, select: { id: true } });
      if (apps.length > 0) {
        await db.videoResponse.deleteMany({ where: { applicationId: { in: apps.map(a => a.id) } } });
      }
      // 2. Delete JobApplications
      await db.jobApplication.deleteMany({ where: { jobPostId: id } });
      // 3. Delete Placements
      await db.placement.deleteMany({ where: { jobPostId: id } });
      // 4. Delete SalaryDates
      await db.salaryDate.deleteMany({ where: { jobPostId: id } });
      // 5. Delete the JobPost itself
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

if old_delete in c:
    c = c.replace(old_delete, new_delete)
    print("job-posts API: DELETE now supports permanent=true")
else:
    print("job-posts API: delete pattern not found")

with open(filepath, 'w') as f:
    f.write(c)
