import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-middleware';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Persistent storage directory for uploaded product images.
// Located OUTSIDE the build pipeline so files survive rebuilds/redeploys.
const PRODUCT_IMAGE_DIR = '/root/gig/uploads/products';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB input limit

/**
 * POST /api/uploads/product-image
 * Admin-only. Accepts a multipart/form-data file upload, resizes the image,
 * saves it to the persistent directory, and returns the public URL path.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const isAdmin = auth.role === 'admin' || auth.role === 'payment_taker';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded. Please select an image.' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a JPG, PNG, WebP, or GIF image.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum allowed size is 10 MB.' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure directory exists
    await fs.mkdir(PRODUCT_IMAGE_DIR, { recursive: true });

    // Generate a unique filename: product-<timestamp>-<random>.jpg
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const filename = `product-${Date.now()}-${randomSuffix}.jpg`;
    const outputPath = path.join(PRODUCT_IMAGE_DIR, filename);

    // Resize to max 1200x900 (maintain aspect ratio, fit inside) and convert to JPEG.
    // .rotate() reads EXIF orientation and physically rotates the pixels so
    // phone photos don't come out sideways.
    await sharp(buffer)
      .rotate()
      .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    // The URL we expose to the client. The /api/uploads/product-image/[filename]
    // route streams the file from PRODUCT_IMAGE_DIR.
    const imageUrl = `/api/uploads/product-image/${filename}`;

    return NextResponse.json({ image: imageUrl, message: 'Image uploaded successfully.' });
  } catch (error) {
    console.error('POST /api/uploads/product-image error:', error);
    return NextResponse.json({ error: 'Failed to upload image. Please try again.' }, { status: 500 });
  }
}

