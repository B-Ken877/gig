import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-middleware';
import { uploadToSupabase, BUCKETS, ensureBucketsExist } from '@/lib/supabase-storage';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

function getExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('x-matroska')) return 'mkv';
  return 'webm';
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can upload videos' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('video');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No video file uploaded' }, { status: 400 });

    const clientMime = formData.get('mimeType') as string | null;
    const actualType = file.type || clientMime || 'video/webm';
    if (!actualType.startsWith('video/')) return NextResponse.json({ error: `Unsupported format: ${actualType}` }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Video is too large. Maximum 100 MB.' }, { status: 400 });

    await ensureBucketsExist();

    const ext = getExtension(actualType);
    const filename = `${auth.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToSupabase(BUCKETS.VIDEOS, filename, arrayBuffer, actualType);

    if (!publicUrl) return NextResponse.json({ error: 'Failed to upload video to storage' }, { status: 500 });

    return NextResponse.json({ videoUrl: publicUrl, message: 'Video uploaded successfully', mimeType: actualType, size: file.size });
  } catch (error) {
    console.error('POST /api/assessments/upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export const maxDuration = 120;
