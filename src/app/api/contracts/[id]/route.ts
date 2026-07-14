import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contract = await db.contract.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    });
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...contract,
      startDate: contract.startDate?.toISOString() || null,
      endDate: contract.endDate?.toISOString() || null,
      renewalDate: contract.renewalDate?.toISOString() || null,
      expirationDate: contract.expirationDate?.toISOString() || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.renewalDate !== undefined) data.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
    if (body.expirationDate !== undefined) data.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null;
    if (body.content !== undefined) data.content = body.content || null;
    if (body.signedPdfUrl !== undefined) data.signedPdfUrl = body.signedPdfUrl || null;

    const contract = await db.contract.update({
      where: { id },
      data,
      include: { client: { include: { user: true } } },
    });

    return NextResponse.json({
      ...contract,
      startDate: contract.startDate?.toISOString() || null,
      endDate: contract.endDate?.toISOString() || null,
      renewalDate: contract.renewalDate?.toISOString() || null,
      expirationDate: contract.expirationDate?.toISOString() || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
