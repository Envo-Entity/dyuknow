const MAX_COMPRESSED_BYTES = 200 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

/** iOS shoots HEIC by default; browsers other than Safari can't decode it
 * in a canvas/<img>. `file.type` is sometimes blank for HEIC picked via a
 * file input, so we also fall back to the extension. */
export function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
}

function loadImage(file: File | Blob): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const revoke = () => URL.revokeObjectURL(objectUrl);
    img.onload = () => resolve({ img, revoke });
    img.onerror = () => {
      revoke();
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Re-encodes an image as JPEG, stepping quality then dimensions down until
 * the result fits under `maxBytes` (default 200KB) — or returns the
 * smallest attempt if it can't get there.
 */
export async function compressImageToJpeg(file: File, maxBytes = MAX_COMPRESSED_BYTES): Promise<Blob> {
  const source = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
  const { img, revoke } = await loadImage(source);
  try {
    let maxDim = 1600;
    let smallest: Blob | null = null;

    while (maxDim >= 400) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) return blob;
      }
      maxDim = Math.round(maxDim * 0.75);
    }

    if (!smallest) throw new Error("Could not compress image");
    return smallest;
  } finally {
    revoke();
  }
}

/** Every member photo is 4:5 portrait (width / height). */
export const PHOTO_ASPECT = 4 / 5;

/** A file the browser can show in an <img>: HEIC becomes JPEG first. */
export async function displayableImage(file: File): Promise<Blob> {
  return isHeicFile(file) ? convertHeicToJpeg(file) : file;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cuts `rect` (in the image's own pixels) out of the photo as a JPEG,
 * at most 1080×1350. Callers compress it afterwards, as with any photo. */
export async function cropImage(file: Blob, rect: CropRect): Promise<File> {
  const { img, revoke } = await loadImage(file);
  try {
    const scale = Math.min(1, 1080 / rect.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 0.92);
    if (!blob) throw new Error("Could not crop image");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    revoke();
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Documents (Right to Work, Food Safety Certificate, CV) — images get
 * compressed the same way photos do; PDFs pass through untouched. */
export async function fileToRawDataUrl(file: File): Promise<string> {
  if (file.type.startsWith("image/") || isHeicFile(file)) {
    return blobToDataUrl(await compressImageToJpeg(file));
  }
  return readAsDataUrl(file);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(await compressImageToJpeg(file));
}
