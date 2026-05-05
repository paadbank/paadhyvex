import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

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

async function compressVideoCloudinary(buffer: Buffer, fileId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Upload raw video first without transformation
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'story-videos',
        public_id: fileId,
        // No transformations during upload for large files
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Build URL with transformation parameters
          // This will be applied on-the-fly when video is accessed
          const baseUrl = result!.secure_url;
          const transformedUrl = baseUrl.replace(
            '/upload/',
            '/upload/w_1280,h_720,c_limit,q_auto:low,br_1m,vc_h264/'
          );
          console.log(`Uploaded to Cloudinary: ${transformedUrl}`);
          resolve(transformedUrl);
        }
      }
    );
    
    uploadStream.end(buffer);
  });
}

async function downloadFromGoogleDrive(fileId: string, type: 'image' | 'video'): Promise<Buffer | null> {
  try {
    if (type === 'image') {
      const downloadUrl = `https://lh3.googleusercontent.com/d/${fileId}=s4000`;
      const response = await fetch(downloadUrl);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    // For videos, try multiple approaches
    const urls = [
      `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY}`,
    ];
    
    for (const url of urls) {
      try {
        // Skip Google API URL if no API key
        if (url.includes('googleapis.com') && !process.env.GOOGLE_API_KEY) continue;
        
        console.log(`Attempting download from: ${url.substring(0, 60)}...`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          redirect: 'follow'
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(`Downloaded ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);
          
          // Verify it's a valid video file (check size and magic bytes)
          if (buffer.length > 1000) {
            return buffer;
          } else {
            console.log('File too small, likely an error page');
          }
        }
      } catch (err) {
        console.error(`Failed to download from ${url}:`, err);
        continue;
      }
    }
    
    console.error('All download attempts failed');
    return null;
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
    let buffer = await downloadFromGoogleDrive(fileId, type);
    if (!buffer) {
      return NextResponse.json({ error: 'Failed to download from Google Drive' }, { status: 500 });
    }

    // Check file size
    const downloadedSizeMB = buffer.length / (1024 * 1024);
    const maxSizeMB = 48;
    
    console.log(`Downloaded: ${downloadedSizeMB.toFixed(2)}MB`);
    
    // If video is too large, compress using Cloudinary
    if (type === 'video' && downloadedSizeMB > maxSizeMB) {
      console.log(`Video too large (${downloadedSizeMB.toFixed(2)}MB), compressing with Cloudinary...`);
      
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return NextResponse.json({ 
          error: 'Video too large and Cloudinary not configured',
          fileSize: `${downloadedSizeMB.toFixed(2)}MB`,
          maxSize: `${maxSizeMB}MB`,
          message: 'Please add Cloudinary credentials to .env.local or compress the video manually to under 48MB'
        }, { status: 413 });
      }
      
      try {
        // Upload to Cloudinary with compression
        const compressedUrl = await compressVideoCloudinary(buffer, fileId);
        console.log(`Compressed and uploaded to Cloudinary: ${compressedUrl}`);
        
        // Update database with Cloudinary URL
        await supabase
          .from('story_media')
          .update({ processed_url: compressedUrl })
          .eq('id', mediaId);
        
        return NextResponse.json({ 
          success: true,
          url: compressedUrl,
          compressed: true,
          originalSize: `${downloadedSizeMB.toFixed(2)}MB`,
          message: 'Video compressed and hosted on Cloudinary'
        });
      } catch (error) {
        console.error('Cloudinary compression failed:', error);
        return NextResponse.json({ 
          error: 'Video compression failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          message: 'Please compress the video manually to under 48MB'
        }, { status: 500 });
      }
    }

    // Generate unique filename
    const hash = generateHash(link);
    const extension = type === 'video' ? 'mp4' : 'jpg';
    const filename = `${hash}.${extension}`;
    const storagePath = `story-media/${filename}`;

    // Upload to Supabase Storage
    const uploadSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`Uploading ${uploadSizeMB}MB to storage...`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, {
        contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      console.error('File size:', uploadSizeMB, 'MB');
      return NextResponse.json({ 
        error: 'Failed to upload to storage', 
        details: uploadError.message,
        fileSize: `${uploadSizeMB}MB`
      }, { status: 500 });
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
