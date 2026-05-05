// Utility to handle large videos by using Google Drive embed instead of downloading
// For videos that exceed Supabase storage limits

export function getGoogleDriveEmbedUrl(driveLink: string): string | null {
  // Extract file ID from Google Drive link
  const match = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  
  const fileId = match[1];
  // Return embeddable URL
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function isGoogleDriveLink(url: string): boolean {
  return url.includes('drive.google.com');
}
