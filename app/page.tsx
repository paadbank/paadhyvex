import { createClient } from '@supabase/supabase-js';
import { mediaUrl, tidy } from '@/lib/format';
import type { FounderStory, Story } from '@/lib/types';
import Landing, { type LandingData, type Photo } from './landing';

// Drawn on the server, so the photographs are in the first response, and refreshed every 15 minutes.
export const revalidate = 900;

const PHOTOS_PER_STORY = 8;
const CANDIDATES_PER_STORY = 24;

/**
 * Whether every browser can show a file, judged by its first bytes. Its name can't be trusted: many
 * phone uploads are HEIC or QuickTime files saved as .jpg, and only Safari draws those.
 */
async function displayable(url: string) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-11' } });
    if (!res.ok) return false;
    const b = new Uint8Array(await res.arrayBuffer());
    const jpeg = b[0] === 0xff && b[1] === 0xd8;
    const png = b[0] === 0x89 && b[1] === 0x50;
    const webp = String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
    return jpeg || png || webp;
  } catch {
    return false;
  }
}

/** A spread of each story's photographs, shuffled together so no wall shows one event in a row. */
async function pickPhotos(stories: Story[]): Promise<Photo[]> {
  const perStory = await Promise.all(stories.map(async (story) => {
    const images = story.story_media.filter((m) => m.type === 'image' && mediaUrl(m));
    const step = Math.max(1, Math.floor(images.length / CANDIDATES_PER_STORY));
    const candidates = images.filter((_, i) => i % step === 0).slice(0, CANDIDATES_PER_STORY).map((m) => mediaUrl(m)!);
    // One at a time, stopping once there are enough: Supabase refuses a burst of requests.
    const good: Photo[] = [];
    for (const src of candidates) {
      if (good.length === PHOTOS_PER_STORY) break;
      if (await displayable(src)) good.push({ src, alt: tidy(story.title) });
    }
    return good;
  }));
  const picked: Photo[] = [];
  for (let i = 0; i < PHOTOS_PER_STORY; i++) for (const photos of perStory) if (photos[i]) picked.push(photos[i]);
  return picked;
}

async function read(): Promise<LandingData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const auth = { auth: { autoRefreshToken: false, persistSession: false } };
  const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, auth);

  const [{ data: rows }, { data: founder }] = await Promise.all([
    db.from('stories').select('*, story_media(*), story_members(*)').eq('is_published', true).order('created_at', { ascending: false }).order('created_at', { foreignTable: 'story_media', ascending: true }),
    db.from('founder_story').select('*').limit(1).maybeSingle(),
  ]);
  const stories = (rows ?? []) as Story[];

  // Distributions are private, so only this one total is read, on the server, and only the sum leaves it.
  let pads = 0;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, auth).from('distributions').select('num_pads');
    pads = (data ?? []).reduce((sum, d) => sum + (d.num_pads || 0), 0);
  }

  const video = stories.flatMap((s) => s.story_media.filter((m) => m.type === 'video' && mediaUrl(m)).map((m) => ({ story: s, url: mediaUrl(m)! })))[0];

  return {
    photos: await pickPhotos(stories),
    places: stories.map((s) => tidy(s.title)),
    people: stories.reduce((sum, s) => sum + s.story_members.length, 0),
    pads,
    founder: founder as FounderStory | null,
    film: video ? { url: video.url, title: tidy(video.story.title), place: tidy(video.story.location), text: video.story.story_text } : null,
    // A card needs one piece of media and no names, so the page doesn't carry the rest.
    stories: stories.slice(0, 4).map((s) => ({ ...s, story_media: s.story_media.slice(0, 1), story_members: [] })),
  };
}

export default async function Page() {
  const empty: LandingData = { photos: [], places: [], people: 0, pads: 0, founder: null, film: null, stories: [] };
  const data = await read().catch((error) => {
    console.error('[landing] Could not read stories:', error);
    return empty;
  });
  return <Landing data={data} />;
}
