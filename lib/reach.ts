'use client';

import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * X in the name: how many girls we are yet to reach. An admin sets it, and every open page shows the
 * new figure at once. One read and one realtime channel are shared by everything that shows it.
 *
 * `null` means no figure yet, or it could not be read: the pages then fall back to words.
 */
let value: number | null = null;
let channel: RealtimeChannel | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: number | null) {
  value = next;
  emit();
}

function start() {
  supabaseBrowser
    .from('site_settings')
    .select('girls_yet_to_reach')
    .eq('id', true)
    .maybeSingle()
    .then(({ data }) => set(data?.girls_yet_to_reach ?? null));

  channel = supabaseBrowser
    .channel('site-settings')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (change) => set((change.new as { girls_yet_to_reach: number | null }).girls_yet_to_reach))
    .subscribe();
}

function stop() {
  if (channel) void supabaseBrowser.removeChannel(channel);
  channel = null;
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function useGirlsToReach(): number | null {
  return useSyncExternalStore(subscribe, () => value, () => null);
}

/** Saves the figure. This device shows it straight away; realtime tells everyone else. */
export async function saveGirlsToReach(next: number) {
  const { data, error } = await supabaseBrowser.from('site_settings').update({ girls_yet_to_reach: next, updated_at: new Date().toISOString() }).eq('id', true).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('You do not have permission to change this figure.');
  set(next);
}
