import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Called once a day by cron-job.org. Supabase pauses a free project after about a week without
 * database activity, so this runs one real (and very small) read. It returns only a status.
 */
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from('stories').select('id', { count: 'exact', head: true });
  if (error) {
    console.error('[keep-alive] Supabase read failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
