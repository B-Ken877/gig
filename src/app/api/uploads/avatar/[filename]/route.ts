import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const AVATAR_DIR = '/tmp/uploads/avatars';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // SECURITY: Reject any path traversal attempts. Only allow simple filenames.
    if (!filename || !/^[\w.\-]+$/.test(filename) || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(AVATAR_DIR, filename);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);

    // Set caching headers so browsers/CDNs can cache avatars aggressively.
    // (When a user uploads a new avatar, the URL changes because it includes a timestamp.)
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      ext === 'gif' ? 'image/gif' :
      'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('GET /api/uploads/avatar/[filename] error:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}
