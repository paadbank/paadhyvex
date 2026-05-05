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

async function downloadFromGoogleDrive(fileId: string, type: 'image' | 'video'): Promise<Buffer | null> {
  try {
    const downloadUrl = type === 'image' 
      ? `https://lh3.googleusercontent.com/d/${fileId}=s4000`
      : `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const response = await fetch(downloadUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mediaId, link, type } = await request.json();

    if (!mediaId || !link || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fileId = getFileIdFromUrl(link);
    if (!fileId) {
      return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
    }

    // Check if already processed
    const { data: existing } = await supabase
      .from('story_media')
      .select('processed_url')
      .eq('id', mediaId)
      .single();

    if (existing?.processed_url) {
      return NextResponse.json({ 
        success: true, 
        url: existing.processed_url,
        cached: true 
      });
    }

    // Download from Google Drive
    const buffer = await downloadFromGoogleDrive(fileId, type);
    if (!buffer) {
      return NextResponse.json({ error: 'Failed to download from Google Drive' }, { status: 500 });
    }

    // Generate unique filename
    const hash = generateHash(link);
    const extension = type === 'video' ? 'mp4' : 'jpg';
    const filename = `${hash}.${extension}`;
    const storagePath = `story-media/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, {
        contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath);

    const processedUrl = urlData.publicUrl;

    // Update database
    const { error: updateError } = await supabase
      .from('story_media')
      .update({ processed_url: processedUrl })
      .eq('id', mediaId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: processedUrl,
      cached: false 
    });

  } catch (error) {
    console.error('Process media error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
