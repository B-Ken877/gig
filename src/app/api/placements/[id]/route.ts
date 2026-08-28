import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// PATCH /api/placements/[id] — admin only. Update placement fields.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.position !== undefined) data.position = body.position;
    if (body.salary !== undefined) data.salary = body.salary ? Number(body.salary) : null;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.nextSalaryDate !== undefined) data.nextSalaryDate = body.nextSalaryDate ? new Date(body.nextSalaryDate) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes || null;

    const updated = await db.placement.update({ where: { id }, data });
    return NextResponse.json({ placement: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('PATCH /api/placements/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update placement' }, { status: 500 });
  }
}

// DELETE /api/placements/[id] — admin only.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await params;
    await db.placement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/placements/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete placement' }, { status: 500 });
  }
}
