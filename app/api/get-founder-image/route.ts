import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getFileIdFromUrl(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function generateHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

async function downloadFromGoogleDrive(fileId: string): Promise<Buffer | null> {
  try {
    const downloadUrl = `https://lh3.googleusercontent.com/d/${fileId}=s4000`;
    const response = await fetch(downloadUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const founderId = searchParams.get('id');

  if (!founderId) {
    return NextResponse.json({ error: 'Founder ID required' }, { status: 400 });
  }

  const { data: founder } = await supabase
    .from('founder_story')
    .select('*')
    .eq('id', founderId)
    .single();

  if (!founder) {
    return NextResponse.json({ error: 'Founder story not found' }, { status: 404 });
  }

  // If already processed, return it
  if (founder.processed_image_url) {
    return NextResponse.json({ url: founder.processed_image_url });
  }

  // Process immediately
  const fileId = getFileIdFromUrl(founder.image_url);
  if (!fileId) {
    return NextResponse.json({ url: founder.image_url });
  }

  const buffer = await downloadFromGoogleDrive(fileId);
  if (!buffer) {
    return NextResponse.json({ url: founder.image_url });
  }

  const hash = generateHash(founder.image_url);
  const filename = `${hash}.jpg`;
  const storagePath = `founder-images/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ url: founder.image_url });
  }

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(storagePath);

  const processedUrl = urlData.publicUrl;

  await supabase
    .from('founder_story')
    .update({ processed_image_url: processedUrl })
    .eq('id', founderId);

  return NextResponse.json({ url: processedUrl });
}
