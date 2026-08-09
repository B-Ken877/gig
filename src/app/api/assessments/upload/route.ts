import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { getAuth } from '@/lib/auth-middleware';

// POST /api/assessments/upload
// Agent uploads a recorded video response. Returns the URL for playback.
// Uses STREAMING to write the file to disk — avoids loading the entire
// video (could be 20-50MB) into memory, which was causing the Node.js
// process to hang / OOM.
const VIDEO_DIR = '/root/gig/uploads/videos';
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
  let tempPath: string | null = null;
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can upload videos' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('video');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No video file uploaded' }, { status: 400 });
    }

    const clientMime = formData.get('mimeType') as string | null;
    const actualType = file.type || clientMime || 'video/webm';

    if (!actualType.startsWith('video/')) {
      return NextResponse.json({
        error: `Unsupported format: ${actualType}. Please use Chrome, Firefox, Edge, or Safari.`,
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Video is too large. Maximum 100 MB.' }, { status: 400 });
    }

    await fs.mkdir(VIDEO_DIR, { recursive: true });

    const ext = getExtension(actualType);
    const filename = `${auth.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const outputPath = path.join(VIDEO_DIR, filename);
    tempPath = outputPath + '.tmp';

    // ─── Stream the file to disk instead of buffering in memory ──────────
    // file.stream() returns a Web ReadableStream. We convert it to a Node.js
    // Readable and pipe it through to a write stream. This handles large
    // video files (20-50MB) without loading them entirely into RAM.
    const webStream = file.stream();
    const nodeStream = Readable.fromWeb(webStream as any);
    const writeStream = createWriteStream(tempPath);

    await pipeline(nodeStream, writeStream);

    // Rename the temp file to the final name (atomic on most filesystems).
    await fs.rename(tempPath, outputPath);
    tempPath = null;

    const videoUrl = `/api/uploads/videos/${filename}`;

    return NextResponse.json({
      videoUrl,
      message: 'Video uploaded successfully',
      mimeType: actualType,
      size: file.size,
    });
  } catch (error) {
    console.error('POST /api/assessments/upload error:', error);
    // Clean up the temp file if it exists.
    if (tempPath) {
      try { await fs.unlink(tempPath); } catch {}
    }
    return NextResponse.json({
      error: 'Failed to upload video: ' + (error instanceof Error ? error.message : String(error)),
    }, { status: 500 });
  }
}

// Allow large uploads — increase the route's max duration.
export const maxDuration = 120; // 2 minutes
