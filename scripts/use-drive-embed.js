// Mark large video to use Google Drive embed instead of downloading
// Usage: node scripts/use-drive-embed.js

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

function getGoogleDriveEmbedUrl(driveLink) {
  const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const fileId = match[1];
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

async function markForEmbed() {
  const mediaId = '1f990c7a-4646-48b3-b806-cd0c0b01acc7';
  const driveLink = 'https://drive.google.com/file/d/138rQjEwspP3guRUvJeTsNcPrkmK2_Rdx/view?usp=drive_link';
  
  const embedUrl = getGoogleDriveEmbedUrl(driveLink);
  
  console.log('Updating video to use Google Drive embed...\n');
  console.log(`Media ID: ${mediaId}`);
  console.log(`Original Link: ${driveLink}`);
  console.log(`Embed URL: ${embedUrl}\n`);

  const { data, error } = await supabase
    .from('story_media')
    .update({ processed_url: embedUrl })
    .eq('id', mediaId)
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! Video will now use Google Drive embed.');
    console.log('Updated record:', data);
  }
}

markForEmbed();
