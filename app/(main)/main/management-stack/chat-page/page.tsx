'use client';

import { useLocation } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { must, usePeople, useUserId } from '@/lib/stacks/data';
import { label } from '@/lib/format';
import type { Message } from '@/lib/types';
import { Conversation } from '@/components/chat/conversation';

export default function ChatPage() {
  const contactId = useLocation()?.params?.contactId as string | undefined;
  const me = useUserId();
  const contact = usePeople().data?.find((p) => p.id === contactId);

  const read = async () => {
    const rows = must(
      await supabaseBrowser.from('messages').select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${me})`).order('created_at', { ascending: true }),
    ) as Message[];
    await supabaseBrowser.from('messages').update({ is_read: true }).eq('recipient_id', me!).eq('sender_id', contactId!);
    return rows;
  };

  const send = async (body: string) => {
    must(await supabaseBrowser.from('messages').insert({ sender_id: me, recipient_id: contactId, body }));
  };

  return <Conversation title={contact?.full_name ?? 'Conversation'} subtitle={label(contact?.role)} me={me} read={read} send={send} />;
}
