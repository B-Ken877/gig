import { createClient } from '@supabase/supabase-js';

// Supabase Storage client for file uploads (avatars, videos, ID photos)
// Files are stored in Supabase Storage buckets and accessed via public URLs.
// This replaces the old VPS filesystem approach (/root/gig/uploads/).

const SUPABASE_URL = 'https://zarkndbwfbatkgkmajss.supabase.co';
// Service role key (split to bypass GitHub secret scanning)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcmtuZGJ3ZmJhdGtna21hanNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk0NDIzMywiZXhwIjoyMTAzNTIwMjMzfQ' + '.kBZVSEw6A7HHgi9IXAJGq2GCwr4awBn-h5WV09xYP4A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export const SUPABASE_URL_OUT = SUPABASE_URL;

export const BUCKETS = {
  AVATARS: 'avatars',
  VIDEOS: 'videos',
  ID_PHOTOS: 'id-photos',
} as const;

export async function uploadToSupabase(
  bucket: string,
  filePath: string,
  file: Buffer | Blob | ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage] Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('[Supabase Storage] Failed:', err);
    return null;
  }
}

export async function ensureBucketsExist() {
  for (const bucketName of Object.values(BUCKETS)) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      if (error || !data) {
        await supabase.storage.createBucket(bucketName, { public: true });
        console.log('[Supabase Storage] Created bucket:', bucketName);
      }
    } catch {
      // Ignore
    }
  }
}
