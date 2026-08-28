import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

// POST /api/agents/verify-id
// Agent submits their ID verification photos (3 photos):
//   - front photo (idCard or driversLicense front)
//   - back photo (idCard or driversLicense back)
//   - selfie photo (holding the ID)
//
// Body (multipart/form-data):
//   - front: File (image)
//   - back: File (image)
//   - selfie: File (image)
//   - type: 'id_card' | 'drivers_license'
const ID_PHOTO_DIR = 'process.cwd() + '/uploads'/id-photos';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per photo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function savePhoto(file: File, userId: string, label: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type for ${label}. Please upload a JPG, PNG, or WebP image.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${label} is too large. Maximum 10 MB per photo.`);
  }

  await fs.mkdir(ID_PHOTO_DIR, { recursive: true });

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${userId}-${label}-${Date.now()}.${ext}`;
  const outputPath = path.join(ID_PHOTO_DIR, filename);
  const tempPath = outputPath + '.tmp';

  const webStream = file.stream();
  const nodeStream = Readable.fromWeb(webStream as any);
  const writeStream = createWriteStream(tempPath);
  await pipeline(nodeStream, writeStream);
  await fs.rename(tempPath, outputPath);

  return `/api/uploads/id-photos/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can submit ID verification' }, { status: 403 });

    const formData = await req.formData();
    const front = formData.get('front');
    const back = formData.get('back');
    const selfie = formData.get('selfie');
    const type = formData.get('type') as string;

    if (!type || !['id_card', 'drivers_license'].includes(type)) {
      return NextResponse.json({ error: 'Please select your document type (ID Card or Driver\'s License)' }, { status: 400 });
    }
    if (!(front instanceof File) || !(back instanceof File) || !(selfie instanceof File)) {
      return NextResponse.json({ error: 'All 3 photos are required (front, back, and selfie holding your ID)' }, { status: 400 });
    }

    const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
    if (!agent) return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });

    // Save all 3 photos (streaming to disk)
    const frontUrl = await savePhoto(front, auth.userId, 'front');
    const backUrl = await savePhoto(back, auth.userId, 'back');
    const selfieUrl = await savePhoto(selfie, auth.userId, 'selfie');

    // Update the agent record
    await db.agent.update({
      where: { id: agent.id },
      data: {
        idVerificationStatus: 'pending',
        idVerificationType: type,
        idFrontPhotoUrl: frontUrl,
        idBackPhotoUrl: backUrl,
        idSelfiePhotoUrl: selfieUrl,
        idVerificationSubmittedAt: new Date(),
        idVerificationReviewedAt: null,
        idVerificationReviewedBy: null,
        idVerificationNotes: null,
      },
    });

    // Notify all admins
    try {
      const { createNotification } = await import('@/lib/notifications');
      const admins = await db.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } });
      const user = await db.user.findUnique({ where: { id: auth.userId }, select: { name: true } });
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          title: 'New ID Verification',
          message: `${user?.name || 'An agent'} submitted their ID verification for review.`,
          type: 'id_verification',
        });
      }
    } catch (e) {
      console.error('[verify-id POST] admin notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'ID verification submitted. We will review it and notify you within 1-2 business days.',
      status: 'pending',
    });
  } catch (error) {
    console.error('POST /api/agents/verify-id error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to submit ID verification',
    }, { status: 500 });
  }
}

// GET /api/agents/verify-id — returns the current agent's verification status
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const agent = await db.agent.findUnique({ where: { userId: auth.userId } });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    return NextResponse.json({
      status: agent.idVerificationStatus,
      type: agent.idVerificationType,
      submittedAt: agent.idVerificationSubmittedAt?.toISOString() || null,
      reviewedAt: agent.idVerificationReviewedAt?.toISOString() || null,
      notes: agent.idVerificationNotes,
    });
  } catch (error) {
    console.error('GET /api/agents/verify-id error:', error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}
