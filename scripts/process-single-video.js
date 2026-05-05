// Process the unprocessed video
// Usage: node scripts/process-single-video.js

async function processVideo() {
  const mediaId = '1f990c7a-4646-48b3-b806-cd0c0b01acc7';
  const link = 'https://drive.google.com/file/d/138rQjEwspP3guRUvJeTsNcPrkmK2_Rdx/view?usp=drive_link';

  console.log('Processing video...\n');
  console.log(`Media ID: ${mediaId}`);
  console.log(`Google Drive: ${link}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/process-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaId,
        link,
        type: 'video'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FAILED');
      console.log('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

processVideo();
