import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('id');

  if (!mediaId) {
    return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
  }

  const { data: media } = await supabase
    .from('story_media')
    .select('*')
    .eq('id', mediaId)
    .single();

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // If already processed, return it
  if (media.processed_url) {
    return NextResponse.json({ url: media.processed_url });
  }

  // Process immediately and wait
  const processResponse = await fetch(`${request.nextUrl.origin}/api/process-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId: media.id,
      link: media.link,
      type: media.type
    })
  });

  const result = await processResponse.json();
  return NextResponse.json({ url: result.url || media.link });
}
