// Script to manually process a video from Google Drive
// Usage: node scripts/process-video.js

const mediaId = '1f990c7a-4646-48b3-b806-cd0c0b01acc7';
const link = 'https://drive.google.com/file/d/138rQjEwspP3guRUvJeTsNcPrkmK2_Rdx/view?usp=drive_link';

async function processVideo() {
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
    console.log('Processing result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

processVideo();
