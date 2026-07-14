import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const expiringSoon = searchParams.get('expiringSoon');

    const clientId = searchParams.get('clientId');
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
      where.expirationDate = {
        gte: new Date(),
        lte: thirtyDaysFromNow,
      };
    }

    const contracts = await db.contract.findMany({
      where,
      include: { client: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const parsedContracts = contracts.map((contract) => ({
      ...contract,
      startDate: contract.startDate ? contract.startDate.toISOString() : null,
      endDate: contract.endDate ? contract.endDate.toISOString() : null,
      renewalDate: contract.renewalDate ? contract.renewalDate.toISOString() : null,
      expirationDate: contract.expirationDate ? contract.expirationDate.toISOString() : null,
    }));

    return NextResponse.json({ contracts: parsedContracts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      type,
      title,
      startDate,
      endDate,
      renewalDate,
      expirationDate,
      status,
      content,
      signedPdfUrl,
    } = body;

    if (!clientId || !type || !title) {
      return NextResponse.json({ error: 'clientId, type, and title are required' }, { status: 400 });
    }

    const contract = await db.contract.create({
      data: {
        clientId,
        type,
        title,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        status: status || 'Active',
        content: content || null,
        signedPdfUrl: signedPdfUrl || null,
      },
      include: { client: { include: { user: true } } },
    });

    return NextResponse.json({
      ...contract,
      startDate: contract.startDate ? contract.startDate.toISOString() : null,
      endDate: contract.endDate ? contract.endDate.toISOString() : null,
      renewalDate: contract.renewalDate ? contract.renewalDate.toISOString() : null,
      expirationDate: contract.expirationDate ? contract.expirationDate.toISOString() : null,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}