// Script to verify and fix broken video URLs in database
// Usage: node scripts/verify-media.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMedia() {
  console.log('Fetching all media with processed_url...\n');
  
  const { data: allMedia, error } = await supabase
    .from('story_media')
    .select('id, link, processed_url, type')
    .not('processed_url', 'is', null);

  if (error) {
    console.error('Error fetching media:', error);
    return;
  }

  console.log(`Found ${allMedia.length} media items with processed_url\n`);

  const broken = [];
  const working = [];

  for (const media of allMedia) {
    // Extract storage path from URL
    const urlMatch = media.processed_url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
    if (!urlMatch) {
      console.log(`❌ Invalid URL format: ${media.id}`);
      broken.push(media);
      continue;
    }

    const storagePath = urlMatch[1];

    // Check if file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('media')
      .list(storagePath.split('/')[0], {
        search: storagePath.split('/')[1]
      });

    if (fileError || !fileData || fileData.length === 0) {
      console.log(`❌ File not found in storage: ${media.id}`);
      console.log(`   Path: ${storagePath}`);
      console.log(`   URL: ${media.processed_url}`);
      broken.push(media);
    } else {
      console.log(`✅ File exists: ${media.id}`);
      working.push(media);
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`✅ Working: ${working.length}`);
  console.log(`❌ Broken: ${broken.length}`);

  if (broken.length > 0) {
    console.log(`\n\n=== BROKEN MEDIA ===`);
    broken.forEach(m => {
      console.log(`\nID: ${m.id}`);
      console.log(`Type: ${m.type}`);
      console.log(`Google Drive: ${m.link}`);
      console.log(`Broken URL: ${m.processed_url}`);
    });

    console.log(`\n\n=== FIX COMMAND ===`);
    console.log(`Run this SQL in Supabase to reset broken URLs:\n`);
    console.log(`UPDATE story_media SET processed_url = NULL WHERE id IN (`);
    console.log(broken.map(m => `  '${m.id}'`).join(',\n'));
    console.log(`);\n`);
  }
}

verifyMedia();
