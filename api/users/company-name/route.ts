import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const client = await db.client.findUnique({
      where: { userId: auth.userId },
      select: { companyName: true },
    });

    return NextResponse.json({ companyName: client?.companyName || null });
  } catch (error) {
    console.error('GET /api/users/company-name error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
