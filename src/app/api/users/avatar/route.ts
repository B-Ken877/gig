import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { uploadToSupabase, BUCKETS, ensureBucketsExist } from '@/lib/supabase-storage';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const formData = await req.formData();
    const file = formData.get('avatar');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF are allowed' }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });

    await ensureBucketsExist();

    const ext = file.type.split('/')[1];
    const filename = `${auth.userId}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToSupabase(BUCKETS.AVATARS, filename, arrayBuffer, file.type);

    if (!publicUrl) return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });

    await db.user.update({ where: { id: auth.userId }, data: { avatar: publicUrl } });

    return NextResponse.json({ avatar: publicUrl, message: 'Avatar updated successfully' });
  } catch (error) {
    console.error('POST /api/users/avatar error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
