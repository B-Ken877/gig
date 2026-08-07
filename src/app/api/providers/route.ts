import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/providers — admin only. Returns all providers with job counts.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const providers = await db.provider.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { jobPosts: true } } },
    });

    const cleaned = providers.map(p => ({
      id: p.id,
      name: p.name,
      contactPerson: p.contactPerson,
      phone: p.phone,
      email: p.email,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
    }));

    return NextResponse.json({ providers: cleaned });
  } catch (error) {
    console.error('GET /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

// POST /api/providers — admin only. Create a new provider.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { name, contactPerson, phone, email, notes } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const provider = await db.provider.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        contactPerson: provider.contactPerson,
        phone: provider.phone,
        email: provider.email,
        notes: provider.notes,
        createdAt: provider.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
