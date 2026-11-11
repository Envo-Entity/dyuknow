// Files from this device to Supabase Storage: read a local uri as bytes,
// compress photos like the website does, and keep the website's path
// conventions and refusal wording.
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Refusal, CONNECTION_ERROR } from '@/domain';
import { DOCUMENT_BUCKET, PHOTO_BUCKET, supabase } from './supabase';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 200 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

// The exact lines the website shows.
export const UPLOAD_COPY = {
  photoTooBig: 'Choose a photo up to 5 MB.',
  fileTooBig: 'Choose a file up to 10 MB.',
  documentType: 'Upload a JPEG, PNG or PDF.',
  photoType: 'Choose a JPEG, PNG or WebP photo.',
  // Onboarding (/join) wording.
  onboardingFile: 'Upload a photo or PDF up to 10 MB.',
  onboardingUnfinished: 'That upload didn’t finish. Add the file again.',
} as const;

export const DOCUMENT_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

/** A local file's size in bytes, or null when it can't be read. */
export function fileSize(uri: string): number | null {
  try {
    const f = new File(uri);
    return f.exists ? f.size : null;
  } catch {
    return null;
  }
}
/** A local file's bytes, for Storage uploads. */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
function removeLocal(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // A cache file left behind is harmless.
  }
}

export type CompressedImage = { uri: string; size: number; width: number; height: number };

/**
 * Re-encodes an image as JPEG, stepping quality (0.85 → 0.35) then size
 * (longest side 1600, ×0.75 each round, down to 400) until it fits under
 * `maxBytes` (≈200 KB), or returns the smallest attempt. Decodes HEIC too.
 * The website's compressImageToJpeg, on the device's own image codec.
 */
export async function compressToJpeg(uri: string, maxBytes = MAX_COMPRESSED_BYTES): Promise<CompressedImage> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const width = original.width;
  const height = original.height;
  original.release();
  let smallest: CompressedImage | null = null;
  const keep = (next: CompressedImage) => {
    if (!smallest || next.size < smallest.size) {
      if (smallest) removeLocal(smallest.uri);
      smallest = next;
      return true;
    }
    removeLocal(next.uri);
    return false;
  };
  let maxDim = 1600;
  while (maxDim >= 400) {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const ctx = ImageManipulator.manipulate(uri);
    if (scale < 1) ctx.resize({ width: w, height: h });
    const image = await ctx.renderAsync();
    try {
      for (const quality of QUALITY_STEPS) {
        const saved = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
        const size = fileSize(saved.uri) ?? Number.MAX_SAFE_INTEGER;
        const attempt = { uri: saved.uri, size, width: saved.width, height: saved.height };
        keep(attempt);
        if (size <= maxBytes) return attempt;
      }
    } finally {
      image.release();
    }
    maxDim = Math.round(maxDim * 0.75);
  }
  if (!smallest) throw new Error('Could not compress image');
  return smallest;
}

/** Storage error → the website's words (profile and account screens). */
function storageError(bucket: string, message: string) {
  if (/exceed|too large|size/i.test(message))
    return new Refusal(bucket === PHOTO_BUCKET ? UPLOAD_COPY.photoTooBig : UPLOAD_COPY.fileTooBig);
  if (/network|fetch|load failed/i.test(message)) return new Refusal(CONNECTION_ERROR);
  return new Error(message);
}

/** Uploads a local file (insert only, never upsert). Throws Refusal/Error. */
export async function uploadFile(bucket: string, path: string, uri: string, contentType: string) {
  let body: ArrayBuffer;
  try {
    body = await readBytes(uri);
  } catch {
    throw new Refusal(UPLOAD_COPY.onboardingUnfinished);
  }
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (error) throw storageError(bucket, error.message);
}
export async function removeFile(bucket: string, path?: string | null) {
  if (!path) return;
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // Best effort.
  }
}

/** member-photos/<auth uid>/<uuid>.jpg */
export function photoPath(userId: string) {
  return `${userId}/${randomUUID()}.jpg`;
}
/** member-documents/<auth uid>/<code>-<uuid>.<ext> */
export function documentPath(userId: string, code: string, mimeType: string) {
  return `${userId}/${code}-${randomUUID()}.${DOCUMENT_EXTENSIONS[mimeType] ?? 'jpg'}`;
}
export { PHOTO_BUCKET, DOCUMENT_BUCKET };
