'use client';

import { useLocation } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { must, useGroups, useUserId } from '@/lib/stacks/data';
import type { Message } from '@/lib/types';
import { Conversation } from '@/components/chat/conversation';

export default function GroupChatPage() {
  const groupId = useLocation()?.params?.groupId as string | undefined;
  const me = useUserId();
  const group = useGroups().data?.find((g) => g.id === groupId);

  const read = async () =>
    must(await supabaseBrowser.from('messages').select('*, profiles:sender_id(full_name)').eq('group_id', groupId!).order('created_at', { ascending: true })) as unknown as Message[];

  const send = async (body: string) => {
    must(await supabaseBrowser.from('messages').insert({ sender_id: me, group_id: groupId, body }));
  };

  return <Conversation title={group?.name ?? 'Group'} subtitle="Group chat" me={me} read={read} send={send} showSender />;
}
