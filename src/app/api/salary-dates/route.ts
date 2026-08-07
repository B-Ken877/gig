import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// GET /api/salary-dates — public for logged-in users (agents see upcoming paydays).
export async function GET() {
  try {
    const dates = await db.salaryDate.findMany({
      orderBy: { payDate: 'asc' },
    });
    const cleaned = dates.map(d => ({
      id: d.id,
      payDate: d.payDate.toISOString(),
      frequency: d.frequency,
      description: d.description,
    }));
    return NextResponse.json({ salaryDates: cleaned });
  } catch (error) {
    console.error('GET /api/salary-dates error:', error);
    return NextResponse.json({ error: 'Failed to fetch salary dates' }, { status: 500 });
  }
}

// POST /api/salary-dates — admin only.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { payDate, frequency, description } = body;
    if (!payDate) return NextResponse.json({ error: 'Pay date is required' }, { status: 400 });

    const created = await db.salaryDate.create({
      data: {
        payDate: new Date(payDate),
        frequency: frequency || 'bi-weekly',
        description: description || null,
      },
    });

    return NextResponse.json({
      salaryDate: {
        id: created.id,
        payDate: created.payDate.toISOString(),
        frequency: created.frequency,
        description: created.description,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/salary-dates error:', error);
    return NextResponse.json({ error: 'Failed to create salary date' }, { status: 500 });
  }
}
