import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VIDEO_DIR = 'process.cwd() + '/uploads'/videos';

// GET /api/uploads/videos/[filename] — serve a recorded video file.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename || !/^[\w.\-]+$/.test(filename) || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(VIDEO_DIR, filename);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);

    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'mp4' ? 'video/mp4' :
      ext === 'ogg' ? 'video/ogg' :
      ext === 'mov' ? 'video/quicktime' :
      ext === 'mkv' ? 'video/x-matroska' :
      'video/webm';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('GET /api/uploads/videos/[filename] error:', error);
    return NextResponse.json({ error: 'Failed to serve video' }, { status: 500 });
  }
}
