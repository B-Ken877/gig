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
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
    });

    if (!clientRecord) {
      clientRecord = await db.client.findFirst({
        where: { userId: id },
        include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
      });
    }

    if (!clientRecord) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      client: {
        ...clientRecord,
        // surface the user's phone at the top level so the profile form can read it
        phone: clientRecord.phone || clientRecord.user?.phone || null,
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

    // ── Split body into Client fields vs User (phone) fields.
    // The Client model owns: companyName, industry, contactPerson, phone (a second
    // number for the company line), billingAddress, billingEmail, taxId, companyLink.
    // The User model owns: phone (the account-holder's personal phone). The profile
    // form sends `phone` and expects it to be saved on the User, not the Client.

    const clientData: Record<string, unknown> = {};
    if (body.companyName !== undefined) clientData.companyName = body.companyName;
    if (body.industry !== undefined) clientData.industry = body.industry || null;
    if (body.contactPerson !== undefined) clientData.contactPerson = body.contactPerson || null;
    if (body.billingAddress !== undefined) clientData.billingAddress = body.billingAddress || null;
    if (body.billingEmail !== undefined) clientData.billingEmail = body.billingEmail || null;
    if (body.taxId !== undefined) clientData.taxId = body.taxId || null;
    if (body.companyLink !== undefined) clientData.companyLink = body.companyLink || null;

    const updated = await db.client.update({
      where: { id },
      data: clientData,
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
    });

    // Update the account-holder's phone on the User model
    if (body.phone !== undefined && updated.userId) {
      await db.user.update({
        where: { id: updated.userId },
        data: { phone: body.phone || null },
      });
    }

    // Re-fetch so we return the freshest state
    const fresh = await db.client.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, accountStatus: true } } },
    });

    return NextResponse.json({
      client: {
        ...fresh,
        phone: fresh?.phone || fresh?.user?.phone || null,
        createdAt: fresh?.createdAt.toISOString(),
        updatedAt: fresh?.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client', details: msg }, { status: 500 });
  }
}
