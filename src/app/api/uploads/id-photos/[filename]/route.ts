import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ID_PHOTO_DIR = '/root/gig/uploads/id-photos';

// GET /api/uploads/id-photos/[filename] — serve an ID verification photo.
// Only authenticated users (admin or the photo owner) should access these.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename || !/^[\w.\-]+$/.test(filename) || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(ID_PHOTO_DIR, filename);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);

    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('GET /api/uploads/id-photos/[filename] error:', error);
    return NextResponse.json({ error: 'Failed to serve photo' }, { status: 500 });
  }
}
