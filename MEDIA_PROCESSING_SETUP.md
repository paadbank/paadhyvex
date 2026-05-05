# Media Processing System

This system automatically downloads Google Drive media (images/videos) and uploads them to Supabase Storage to avoid iframe control bar overlap issues on mobile.

## Setup Instructions

### 1. Database Migration

Run the SQL migration in your Supabase SQL Editor:

```bash
# File: media-processing-migration.sql
```

This will:
- Add `processed_url` column to `story_media` table
- Create storage bucket policies
- Set up triggers for automatic cleanup on delete/update

### 2. Create Supabase Storage Bucket

In Supabase Dashboard:
1. Go to **Storage**
2. Click **New bucket**
3. Name: `media`
4. Public bucket: **Yes**
5. Click **Create bucket**

### 3. Environment Variables

Add to your `.env.local` and Vercel environment variables:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CRON_SECRET=generate_a_random_secret_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Get the service role key from:
- Supabase Dashboard → Settings → API → service_role key

Generate CRON_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Vercel Cron Job Setup

The `vercel.json` file configures a cron job that runs every 10 minutes to process unprocessed media.

**In Vercel Dashboard:**
1. Go to your project → Settings → Environment Variables
2. Add `CRON_SECRET` with the same value as local
3. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key
4. Deploy your project

### 5. How It Works

**Automatic Processing:**
- Every 10 minutes, Vercel cron job checks for unprocessed media
- Downloads from Google Drive
- Uploads to Supabase Storage
- Updates `processed_url` in database

**Manual Processing:**
You can also trigger processing manually:

```bash
curl -X POST https://your-app.vercel.app/api/process-media \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "uuid-here",
    "link": "https://drive.google.com/file/d/FILE_ID/view",
    "type": "video"
  }'
```

**Cleanup:**
- When a story_media record is deleted, the storage file is automatically deleted
- When a link is updated, the old file is deleted and `processed_url` is cleared for re-processing

### 6. Update Frontend Code

Modify your story display components to use `processed_url` when available:

```typescript
// Instead of:
const videoUrl = getEmbedUrl(media.link);

// Use:
const videoUrl = media.processed_url || getEmbedUrl(media.link);
```

For videos, use HTML5 video player instead of iframe:

```tsx
{media.processed_url ? (
  <video 
    src={media.processed_url} 
    controls 
    className={styles.video}
    playsInline
  />
) : (
  <iframe src={getEmbedUrl(media.link)} ... />
)}
```

## Benefits

✅ No more iframe control bar overlap issues
✅ Faster loading (served from CDN)
✅ Better mobile experience with native video controls
✅ Automatic cleanup on delete/update
✅ Works offline once cached
✅ No dependency on Google Drive availability

## Monitoring

Check cron job logs in Vercel:
1. Go to your project → Deployments
2. Click on latest deployment
3. Go to **Functions** tab
4. Find `/api/cron/process-media`
5. View logs

## Troubleshooting

**Media not processing:**
- Check Vercel function logs
- Verify CRON_SECRET is set correctly
- Ensure Google Drive files are shared publicly

**Storage upload fails:**
- Verify `media` bucket exists and is public
- Check service role key is correct
- Ensure storage policies are created

**Old files not deleting:**
- Check trigger functions are created
- Verify service role key has storage permissions
