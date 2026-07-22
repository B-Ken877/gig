import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;

    let clientRecord = await db.client.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, accountStatus: true } } },
    });

    if (!clientRecord) {
      clientRecord = await db.client.findFirst({
        where: { userId: id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, accountStatus: true } } },
      });
    }

    if (!clientRecord) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      client: {
        ...clientRecord,
        createdAt: clientRecord.createdAt?.toISOString(),
        updatedAt: clientRecord.updatedAt?.toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client', details: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await request.json();

    const updated = await db.client.update({
      where: { id },
      data: body,
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, accountStatus: true } } },
    });

    return NextResponse.json({ client: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client', details: msg }, { status: 500 });
  }
}