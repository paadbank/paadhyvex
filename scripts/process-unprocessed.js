// Script to find unprocessed media and attempt to process them
// Usage: node scripts/process-unprocessed.js

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

async function findUnprocessed() {
  console.log('Fetching media without processed_url...\n');
  
  const { data: unprocessed, error } = await supabase
    .from('story_media')
    .select('id, story_id, link, type')
    .is('processed_url', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching media:', error);
    return;
  }

  console.log(`Found ${unprocessed.length} unprocessed media items\n`);

  if (unprocessed.length === 0) {
    console.log('✅ All media has been processed!');
    return;
  }

  console.log('=== UNPROCESSED MEDIA ===\n');
  unprocessed.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`Story ID: ${m.story_id}`);
    console.log(`Type: ${m.type}`);
    console.log(`Google Drive: ${m.link}`);
    console.log('---\n');
  });

  console.log('\n=== PROCESS THEM ===');
  console.log('To process these media items, you can:');
  console.log('1. Visit the story page - they will auto-process when viewed');
  console.log('2. Or run this command for each:\n');
  
  unprocessed.forEach(m => {
    console.log(`curl -X POST http://localhost:3000/api/process-media \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"mediaId":"${m.id}","link":"${m.link}","type":"${m.type}"}'\n`);
  });
}

findUnprocessed();
