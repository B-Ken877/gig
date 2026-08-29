import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL_OUT, BUCKETS } from '@/lib/supabase-storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || !/^[\w.\-]+$/.test(filename)) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }
  return NextResponse.redirect(`${SUPABASE_URL_OUT}/storage/v1/object/public/${BUCKETS.ID_PHOTOS}/${filename}`);
}
