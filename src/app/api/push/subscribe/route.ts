import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveSubscription, removeSubscription, vapidPublicKey } from '@/lib/push';

export async function GET() {
  return NextResponse.json({ vapidPublicKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await saveSubscription(db, userId, body.subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await removeSubscription(db, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}