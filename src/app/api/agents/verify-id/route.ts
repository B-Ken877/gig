import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { uploadToSupabase, BUCKETS, ensureBucketsExist } from '@/lib/supabase-storage';
import { createNotification } from '@/lib/notifications';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per photo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function savePhoto(file: File, userId: string, label: string): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${label} too large (max 10MB)`);
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error(`${label} must be JPEG, PNG, or WebP`);

  const ext = file.type.split('/')[1];
  const filename = `${userId}-${label}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const publicUrl = await uploadToSupabase(BUCKETS.ID_PHOTOS, filename, arrayBuffer, file.type);

  if (!publicUrl) throw new Error(`Failed to upload ${label}`);
  return publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Only agents can submit ID verification' }, { status: 403 });

    const formData = await req.formData();
    const type = formData.get('type') as string;
    const front = formData.get('front') as File | null;
    const back = formData.get('back') as File | null;
    const selfie = formData.get('selfie') as File | null;

    if (!type || !front || !back || !selfie) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await ensureBucketsExist();

    const frontUrl = await savePhoto(front, auth.userId, 'front');
    const backUrl = await savePhoto(back, auth.userId, 'back');
    const selfieUrl = await savePhoto(selfie, auth.userId, 'selfie');

    await db.agent.update({
      where: { userId: auth.userId },
      data: {
        idVerificationStatus: 'pending',
        idVerificationType: type,
        idFrontPhotoUrl: frontUrl,
        idBackPhotoUrl: backUrl,
        idSelfiePhotoUrl: selfieUrl,
        idVerificationSubmittedAt: new Date(),
      },
    });

    try {
      const admins = await db.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } });
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          title: 'New ID Verification Submitted',
          message: 'An agent has submitted their ID for review.',
          type: 'id_verification',
          pushUrl: '/#admin-verifications',
        });
      }
    } catch (e) { console.error('[verify-id] notification failed:', e); }

    return NextResponse.json({ message: 'ID verification submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents/verify-id error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to submit verification' }, { status: 500 });
  }
}
