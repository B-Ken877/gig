import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

// Persistent storage directory for uploaded avatars.
// Located OUTSIDE the build pipeline so files survive rebuilds/redeploys.
const AVATAR_DIR = '/root/gig/uploads/avatars';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB input limit (before resize)

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId } = auth;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded. Please select an image.' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a JPG, PNG, WebP, or GIF image.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum allowed size is 8 MB.' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure directory exists
    await fs.mkdir(AVATAR_DIR, { recursive: true });

    // Generate a stable filename: <userId>-<timestamp>.jpg
    // We convert to JPEG for size efficiency (typical avatars are <50KB after resize).
    const filename = `${userId}-${Date.now()}.jpg`;
    const outputPath = path.join(AVATAR_DIR, filename);

    // Resize to 256x256 square (cover fit) and convert to JPEG.
    // .rotate() (no args) tells sharp to read the EXIF Orientation tag
    // and physically rotate the pixels before resizing. Without this,
    // photos taken on a phone in portrait mode come out upside-down or
    // sideways because the sensor data is landscape + an EXIF tag.
    await sharp(buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    // The URL we expose to the client. The /api/uploads/avatar/[filename]
    // route streams the file from AVATAR_DIR.
    const avatarUrl = `/api/uploads/avatar/${filename}`;

    // Update the User.avatar field in the database
    // If the user previously had an avatar, try to delete the old file (best-effort)
    const existingUser = await db.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (existingUser?.avatar) {
      const oldFilename = existingUser.avatar.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(AVATAR_DIR, oldFilename);
        await fs.unlink(oldPath).catch(() => { /* best-effort */ });
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true, name: true, email: true, role: true, phone: true, accountStatus: true, isActive: true },
    });

    return NextResponse.json({ avatar: avatarUrl, message: 'Profile picture updated successfully.' });
  } catch (error) {
    console.error('POST /api/users/avatar error:', error);
    return NextResponse.json({ error: 'Failed to upload image. Please try again.' }, { status: 500 });
  }
}
