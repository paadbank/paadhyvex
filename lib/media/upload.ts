import { supabaseBrowser } from '@/lib/supabase/client';

export type MediaProvider = 'supabase' | 'cloudinary';
export type MediaKind = 'image' | 'video';

export type UploadedMedia = {
  url: string;
  storagePath: string | null;
  provider: MediaProvider;
  type: MediaKind;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const SUPABASE_MAX_BYTES = 45 * 1024 * 1024;
const CLOUDINARY_MAX_BYTES = 100 * 1024 * 1024;

export const MAX_UPLOAD_BYTES = CLOUDINARY_MAX_BYTES;

export function kindForFile(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

function extFor(file: File) {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/')[1] || 'bin';
}

function xhrUpload(url: string, headers: Record<string, string>, file: File, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

async function uploadToSupabaseStorage(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const kind = kindForFile(file)!;
  const path = `story-media/${crypto.randomUUID()}.${extFor(file)}`;

  await xhrUpload(
    `${SUPABASE_URL}/storage/v1/object/media/${path}`,
    {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    file,
    onProgress
  );

  const { data } = supabaseBrowser.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, storagePath: path, provider: 'supabase', type: kind };
}

async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured for large-video uploads');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });

  const transformedUrl = result.secure_url.replace('/upload/', '/upload/w_1280,h_720,c_limit,q_auto:low,br_1m,vc_h264/');
  return { url: transformedUrl, storagePath: null, provider: 'cloudinary', type: 'video' };
}

export async function uploadStoryMedia(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  const kind = kindForFile(file);
  if (!kind) throw new Error('Only image or video files are supported');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Max is 100MB — please compress it first.`);
  }

  if (kind === 'image' || file.size <= SUPABASE_MAX_BYTES) {
    return uploadToSupabaseStorage(file, onProgress);
  }
  return uploadToCloudinary(file, onProgress);
}

export async function deleteStoryMedia(item: { provider?: string | null; storagePath?: string | null }) {
  if (item.provider === 'supabase' && item.storagePath) {
    await supabaseBrowser.storage.from('media').remove([item.storagePath]);
  }
  // Cloudinary assets are left in place (no client-safe delete without a signed request);
  // they're cheap to keep and can be cleaned up from the Cloudinary dashboard if needed.
}
