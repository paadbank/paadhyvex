// One-off migration: pull remaining Google Drive-hosted story media into Supabase
// Storage (or Cloudinary for videos too large for the Supabase free-tier 50MB cap).
// Usage: node scripts/migrate-drive-media.mjs
//
// Writes a JSON report of failures to scripts/migrate-report.json so anything
// that can't be auto-recovered from Drive can be re-uploaded by hand through
// the new admin upload UI.

import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '..', '.env.local');
const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET,
});

const SUPABASE_MAX_BYTES = 45 * 1024 * 1024; // stay under the 50MB project hard cap
const CLOUDINARY_MAX_BYTES = 100 * 1024 * 1024; // free-plan video cap
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getFileId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchBuffer(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
  const contentType = res.headers.get('content-type') || '';
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, contentType, buf, setCookie };
}

// Robust Drive download: handles the "can't scan for viruses" interstitial on large files.
async function downloadFromDrive(fileId, type) {
  // 1. Newer direct-content host — works for most files without cookie juggling.
  try {
    const r = await fetchBuffer(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`);
    if (r.ok && !r.contentType.includes('text/html') && r.buf.length > 2000) {
      return r.buf;
    }
  } catch {}

  // 2. Image-specific fast path.
  if (type === 'image') {
    try {
      const r = await fetchBuffer(`https://lh3.googleusercontent.com/d/${fileId}=s4000`);
      if (r.ok && r.buf.length > 500) return r.buf;
    } catch {}
  }

  // 3. Legacy uc?export=download with confirm-token scraping for the virus-scan interstitial.
  try {
    const first = await fetchBuffer(`https://drive.google.com/uc?export=download&id=${fileId}`);
    if (first.ok && !first.contentType.includes('text/html') && first.buf.length > 2000) {
      return first.buf;
    }
    const html = first.buf.toString('utf8');
    const tokenMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
    const cookie = first.setCookie.map(c => c.split(';')[0]).join('; ');
    if (tokenMatch) {
      const second = await fetchBuffer(
        `https://drive.google.com/uc?export=download&confirm=${tokenMatch[1]}&id=${fileId}`,
        cookie ? { Cookie: cookie } : {}
      );
      if (second.ok && !second.contentType.includes('text/html') && second.buf.length > 2000) {
        return second.buf;
      }
    }
  } catch {}

  return null;
}

function extFor(type, contentTypeGuess) {
  if (type === 'video') return 'mp4';
  return 'jpg';
}

async function uploadToSupabase(buffer, storagePath, type) {
  const { error } = await supabase.storage.from('media').upload(storagePath, buffer, {
    contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(storagePath);
  return data.publicUrl;
}

function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder: 'story-videos', public_id: publicId },
      (err, result) => {
        if (err) return reject(err);
        const transformed = result.secure_url.replace('/upload/', '/upload/w_1280,h_720,c_limit,q_auto:low,br_1m,vc_h264/');
        resolve(transformed);
      }
    );
    stream.end(buffer);
  });
}

async function processRow(row, index, total) {
  const label = `[${index + 1}/${total}] ${row.type} ${row.id}`;
  const fileId = getFileId(row.link);
  if (!fileId) {
    console.log(`${label} SKIP (no file id in link)`);
    return { ...row, reason: 'no_file_id' };
  }

  const buffer = await downloadFromDrive(fileId, row.type);
  if (!buffer) {
    console.log(`${label} FAIL (download)`);
    return { ...row, reason: 'download_failed' };
  }

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

  try {
    let processedUrl, storagePath = null, provider;

    if (row.type === 'image' || buffer.length <= SUPABASE_MAX_BYTES) {
      const ext = extFor(row.type);
      storagePath = `story-media/${row.story_id}/${row.id}.${ext}`;
      processedUrl = await uploadToSupabase(buffer, storagePath, row.type);
      provider = 'supabase';
    } else if (buffer.length <= CLOUDINARY_MAX_BYTES) {
      processedUrl = await uploadToCloudinary(buffer, row.id);
      provider = 'cloudinary';
    } else {
      console.log(`${label} FAIL (too large: ${sizeMB}MB)`);
      return { ...row, reason: `too_large_${sizeMB}MB` };
    }

    await supabase.from('story_media').update({
      processed_url: processedUrl,
      storage_path: storagePath,
      provider,
    }).eq('id', row.id);

    console.log(`${label} OK -> ${provider} (${sizeMB}MB)`);
    return null;
  } catch (err) {
    console.log(`${label} FAIL (upload: ${err.message})`);
    return { ...row, reason: `upload_failed_${err.message}` };
  }
}

async function main() {
  const retryOnly = process.argv.includes('--retry-failed');
  const { data: rows, error } = await supabase
    .from('story_media')
    .select('id, story_id, link, type')
    .eq('provider', retryOnly ? 'failed' : 'legacy_drive')
    .order('created_at');

  if (error) throw error;
  console.log(`${retryOnly ? 'Retrying' : 'Migrating'} ${rows.length} media rows...\n`);

  const CONCURRENCY = retryOnly ? 2 : 4;
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < rows.length) {
      const i = cursor++;
      const result = await processRow(rows[i], i, rows.length);
      if (result) failures.push(result);
      await sleep(retryOnly ? 800 : 150);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const succeeded = rows.length - failures.length;
  console.log(`\n=== DONE: ${succeeded}/${rows.length} succeeded, ${failures.length} failed ===`);

  if (failures.length > 0) {
    await supabase.from('story_media').update({ provider: 'failed' }).in('id', failures.map(f => f.id));
    const reportPath = path.join(__dirname, 'migrate-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));
    console.log(`Failure report written to ${reportPath}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
