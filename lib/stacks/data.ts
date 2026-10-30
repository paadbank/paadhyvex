'use client';

import { StateStack } from '@academix-admin/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuthContext } from '@/providers/AuthProvider';
import { useResource } from './resource';
import type { AppNotification, CycleLog, Distribution, Expense, FounderStory, MessageGroup, Person, Profile, Story } from '@/lib/types';

/** One owning hook per piece of data; every screen that shows it calls that hook. */
const SCOPES = ['profile', 'cycles', 'distributions', 'expenses', 'people', 'groups', 'notifications', 'stories', 'dashboard'] as const;
export type Scope = (typeof SCOPES)[number];

/** A write landed: re-read whatever shows it. The dashboard's figures come from all of it. */
export function changed(...scopes: Scope[]) {
  for (const scope of [...scopes, 'dashboard' as const]) StateStack.core.invalidateScope(scope);
}

/** Everything cached belongs to the person signed in, and phones get shared. */
export function clearCachedData() {
  for (const scope of SCOPES) StateStack.clearScope(scope);
}

/** A Supabase failure as an Error, so a form or a loader can show its message. */
export function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Proof of who is calling, for server actions: they never take the browser's word for it. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

export function useUserId(): string | null {
  return useAuthContext().session?.user?.id ?? null;
}

export function useProfile() {
  const id = useUserId();
  return useResource<Profile>({
    key: `profile:${id}`,
    scope: 'profile',
    enabled: Boolean(id),
    deps: [id],
    read: async () => must(await supabaseBrowser.from('profiles').select('*').eq('id', id!).single()) as Profile,
  });
}

export function useRole() {
  return useProfile().data?.role ?? null;
}

export function useMyCycles() {
  const id = useUserId();
  return useResource<CycleLog[]>({
    key: `cycles:${id}`,
    scope: 'cycles',
    enabled: Boolean(id),
    deps: [id],
    read: async () => must(await supabaseBrowser.from('cycle_logs').select('*').eq('beneficiary_id', id!).order('start_date', { ascending: false })) as CycleLog[],
  });
}

const DISTRIBUTION_COLUMNS = '*, beneficiary:profiles!beneficiary_id(full_name), distributor:profiles!distributor_id(full_name)';

export function useDistributions() {
  return useResource<Distribution[]>({
    key: 'distributions',
    scope: 'distributions',
    read: async () => must(await supabaseBrowser.from('distributions').select(DISTRIBUTION_COLUMNS).order('created_at', { ascending: false })) as unknown as Distribution[],
  });
}

export function useExpenses() {
  return useResource<Expense[]>({
    key: 'expenses',
    scope: 'expenses',
    read: async () =>
      must(await supabaseBrowser.from('expense_records').select('*, recorded_by_profile:profiles!recorded_by(full_name)').order('created_at', { ascending: false })) as unknown as Expense[],
  });
}

/** Everyone, newest first: the admin list and the users report. */
export function useUsers() {
  return useResource<Profile[]>({
    key: 'users',
    scope: 'people',
    read: async () => must(await supabaseBrowser.from('profiles').select('*').order('created_at', { ascending: false })) as Profile[],
  });
}

/** Everyone except you, by name: contacts and new-group members. */
export function usePeople() {
  const id = useUserId();
  return useResource<Person[]>({
    key: `contacts:${id}`,
    scope: 'people',
    enabled: Boolean(id),
    deps: [id],
    read: async () => must(await supabaseBrowser.from('profiles').select('id, full_name, role, email').neq('id', id!).order('full_name')) as Person[],
  });
}

export function useBeneficiaries() {
  return useResource<Pick<Profile, 'id' | 'full_name'>[]>({
    key: 'beneficiaries',
    scope: 'people',
    read: async () => must(await supabaseBrowser.from('profiles').select('id, full_name').eq('role', 'beneficiary').order('full_name')) as Pick<Profile, 'id' | 'full_name'>[],
  });
}

export function useGroups() {
  const id = useUserId();
  return useResource<MessageGroup[]>({
    key: `groups:${id}`,
    scope: 'groups',
    enabled: Boolean(id),
    deps: [id],
    read: async () =>
      must(await supabaseBrowser.from('message_groups').select('*, message_group_members!inner(user_id)').eq('message_group_members.user_id', id!).order('created_at', { ascending: false })) as unknown as MessageGroup[],
  });
}

/** The people you've messaged lately, newest first. */
export function useRecentContacts() {
  const id = useUserId();
  return useResource<string[]>({
    key: `recent-contacts:${id}`,
    scope: 'groups',
    enabled: Boolean(id),
    deps: [id],
    read: async () => {
      const rows = must(
        await supabaseBrowser.from('messages').select('sender_id, recipient_id').or(`sender_id.eq.${id},recipient_id.eq.${id}`).not('recipient_id', 'is', null).order('created_at', { ascending: false }).limit(50),
      ) as { sender_id: string; recipient_id: string }[];
      return [...new Set(rows.map((m) => (m.sender_id === id ? m.recipient_id : m.sender_id)))].slice(0, 5);
    },
  });
}

export function useNotifications() {
  const id = useUserId();
  return useResource<AppNotification[]>({
    key: `notifications:${id}`,
    scope: 'notifications',
    enabled: Boolean(id),
    deps: [id],
    read: async () => must(await supabaseBrowser.from('notifications').select('*').eq('recipient_id', id!).order('created_at', { ascending: false })) as AppNotification[],
  });
}

const STORY_COLUMNS = '*, story_media(*), story_members(*)';

export function usePublishedStories() {
  return useResource<Story[]>({
    key: 'stories:published',
    scope: 'stories',
    read: async () =>
      must(await supabaseBrowser.from('stories').select(STORY_COLUMNS).eq('is_published', true).order('created_at', { ascending: false }).order('created_at', { foreignTable: 'story_media', ascending: true })) as Story[],
  });
}

export function useAllStories() {
  return useResource<Story[]>({
    key: 'stories:all',
    scope: 'stories',
    read: async () => must(await supabaseBrowser.from('stories').select(STORY_COLUMNS).order('created_at', { ascending: false }).order('created_at', { foreignTable: 'story_media', ascending: true })) as Story[],
  });
}

export function useFounderStory() {
  return useResource<FounderStory | { id: null }>({
    key: 'founder-story',
    scope: 'stories',
    // A resource's `null` means "not read yet", so "there is none" needs its own answer.
    read: async () => ((await supabaseBrowser.from('founder_story').select('*').limit(1).maybeSingle()).data as FounderStory | null) ?? { id: null },
  });
}
