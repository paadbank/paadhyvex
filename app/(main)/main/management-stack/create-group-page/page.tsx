'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, usePeople, useUserId } from '@/lib/stacks/data';
import { label } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Avatar, List, Row, Section } from '@/components/ui/display';
import { Button, Form, TextField } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';

export default function CreateGroupPage() {
  const nav = useNav();
  const me = useUserId();
  const people = usePeople();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Set<string>>(new Set());
  const { busy, submit, dialog } = useSubmit();

  const toggle = (id: string) =>
    setMembers((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const create = () =>
    submit(async () => {
      if (!name.trim() || members.size === 0) return;
      const group = must(await supabaseBrowser.from('message_groups').insert({ name: name.trim(), created_by: me }).select().single()) as { id: string };
      must(await supabaseBrowser.from('message_group_members').insert([me!, ...members].map((user_id) => ({ group_id: group.id, user_id }))));
      changed('groups');
      await nav.replace('group_chat_page', { groupId: group.id });
    });

  return (
    <PageScaffold title="New group">
      <Form onSubmit={create}>
        <TextField label="Group name" value={name} onChange={setName} required />
        <PageState status={statusOf(people, 'contacts')}>
          {() => (
            <Section title={`Members (${members.size})`}>
              <List>
                {people.data!.map((p) => (
                  <Row
                    key={p.id}
                    leading={<Avatar name={p.full_name} />}
                    title={p.full_name}
                    meta={label(p.role)}
                    trailing={<input type="checkbox" checked={members.has(p.id)} readOnly tabIndex={-1} aria-hidden="true" />}
                    onClick={() => toggle(p.id)}
                  />
                ))}
              </List>
            </Section>
          )}
        </PageState>
        <Button type="submit" full busy={busy} disabled={!name.trim() || members.size === 0}>Create group</Button>
      </Form>
      {dialog}
    </PageScaffold>
  );
}
