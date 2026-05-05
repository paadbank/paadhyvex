// Reset processed_url to null so video can be reprocessed
// Usage: node scripts/reset-video.js

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

async function resetVideo() {
  const mediaId = '1f990c7a-4646-48b3-b806-cd0c0b01acc7';
  
  console.log('Resetting processed_url to null...\n');
  console.log(`Media ID: ${mediaId}\n`);

  const { data, error } = await supabase
    .from('story_media')
    .update({ processed_url: null })
    .eq('id', mediaId)
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! Video can now be reprocessed.');
    console.log('Run: node scripts/process-single-video.js');
  }
}

resetVideo();
