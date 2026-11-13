export type MediaProvider = 'supabase' | 'cloudinary';
export type MediaKind = 'image' | 'video';

export type UploadedMedia = {
  url: string;
  storagePath: string | null;
  provider: MediaProvider;
  type: MediaKind;
};

/*
 * Story photos and videos live on Cloudinary. Supabase Storage is no longer written to: the free
 * plan's 1 GB filled up and the whole project was suspended. Older rows may still say 'supabase'.
 */
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Cloudinary's free plan refuses images over 10 MB and videos over 100 MB.
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function kindForFile(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

/** A provider from a stored address, for rows saved before `provider` was kept. */
export function providerForUrl(url: string): MediaProvider | null {
  if (url.includes('res.cloudinary.com')) return 'cloudinary';
  if (url.includes('supabase.co')) return 'supabase';
  return null;
}

/** A large photo, shrunk in the browser to fit the 10 MB limit. */
async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`This photo is ${(file.size / 1024 / 1024).toFixed(0)} MB and this browser can't shrink it. Use a photo under 10 MB.`);
  }
  const scale = Math.min(1, 3200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob || blob.size > IMAGE_MAX_BYTES) throw new Error('This photo is too large. Use a photo under 10 MB.');
  return blob;
}

type CloudinaryResult = { resource_type: 'image' | 'video'; version: number; public_id: string };

/** Photos are converted to a format every browser shows (iPhone HEIC included); videos are kept light. */
function deliveryUrl(result: CloudinaryResult, kind: MediaKind) {
  const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;
  const id = `v${result.version}/${result.public_id}`;
  if (result.resource_type === 'image') return `${base}/image/upload/f_auto,q_auto/${id}`;
  // A clip saved as a photo (an iPhone Live Photo) is shown as its first frame.
  if (kind === 'image') return `${base}/video/upload/so_0,f_jpg,q_auto/${id}.jpg`;
  return `${base}/video/upload/w_1280,h_720,c_limit,q_auto,vc_h264/${id}.mp4`;
}

export async function uploadStoryMedia(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  const kind = kindForFile(file);
  if (!kind) throw new Error('Only image or video files are supported');
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error('Media uploads are not configured.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Max is 100MB. Compress it first.`);
  }

  const body = kind === 'image' && file.size > IMAGE_MAX_BYTES ? await shrink(file) : file;
  const form = new FormData();
  form.append('file', body);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const result = await new Promise<CloudinaryResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const json = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(json);
      else reject(new Error(json.error?.message ? `Upload failed: ${json.error.message}` : `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });

  return { url: deliveryUrl(result, kind), storagePath: result.public_id, provider: 'cloudinary', type: kind };
}

export async function deleteStoryMedia(_item: { provider?: string | null; storagePath?: string | null }) {
  // Cloudinary files are kept: deleting needs the API secret, which never reaches the browser. They
  // are cheap to keep and can be removed from the Cloudinary dashboard.
}
