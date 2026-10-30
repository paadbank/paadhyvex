'use client';

import { useState } from 'react';
import { useNav, usePageLifecycle } from '@academix-admin/navigation-stack';
import { useGroups, usePeople, useRecentContacts } from '@/lib/stacks/data';
import { label } from '@/lib/format';
import type { Person } from '@/lib/types';
import { PageScaffold, PageState, PinnedSection, statusOf } from '@/components/ui/page';
import { Avatar, List, Row, Section } from '@/components/ui/display';
import { Button, FilterBar, Segmented, TextField } from '@/components/ui/controls';
import { PlusIcon } from '@/components/ui/icons';

const TABS = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'groups', label: 'Groups' },
];

const ROLES = [
  { value: 'all', label: 'All' },
  { value: 'beneficiary', label: 'Beneficiaries' },
  { value: 'distributor', label: 'Distributors' },
  { value: 'admin', label: 'Admins' },
];

export default function MessagingPage() {
  const nav = useNav();
  const people = usePeople();
  const groups = useGroups();
  const recent = useRecentContacts();
  const [tab, setTab] = useState('contacts');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');

  usePageLifecycle(nav, { onResume: () => { groups.reload(); recent.reload(); } }, [groups.reload, recent.reload]);

  const q = query.trim().toLowerCase();
  const shown = (people.data ?? []).filter((p) => (role === 'all' || p.role === role) && (!q || p.full_name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)));
  const recentPeople = (recent.data ?? []).map((id) => people.data?.find((p) => p.id === id)).filter((p): p is Person => Boolean(p));

  const contact = (p: Person) => <Row key={p.id} leading={<Avatar name={p.full_name} />} title={p.full_name} meta={label(p.role)} onClick={() => nav.push('chat_page', { contactId: p.id })} />;
  const newGroup = () => nav.push('create_group_page');

  return (
    <PageScaffold title="Messages" actions={tab === 'groups' ? [{ icon: <PlusIcon />, onClick: newGroup, ariaLabel: 'New group' }] : undefined}>
      <PinnedSection>
        <Segmented value={tab} options={TABS} onChange={setTab} />
        {tab === 'contacts' && (
          <>
            <TextField keyboardType="search" hint="Search contacts" value={query} onChange={setQuery} />
            <FilterBar value={role} options={ROLES} onChange={setRole} />
          </>
        )}
      </PinnedSection>

      {tab === 'contacts' ? (
        <PageState status={statusOf(people, 'contacts')}>
          {() => (
            <>
              {recentPeople.length > 0 && !q && role === 'all' && (
                <Section title="Recent">
                  <List>{recentPeople.map(contact)}</List>
                </Section>
              )}
              <Section title="All contacts">
                {shown.length > 0 ? <List>{shown.map(contact)}</List> : <p>No contacts match that search.</p>}
              </Section>
            </>
          )}
        </PageState>
      ) : (
        <PageState status={statusOf(groups, 'groups', { when: (d) => d.length === 0, title: 'No groups yet', action: <Button onClick={newGroup}>New group</Button> })}>
          {() => (
            <List>
              {groups.data!.map((g) => <Row key={g.id} leading={<Avatar name={g.name} />} title={g.name} meta="Group chat" onClick={() => nav.push('group_chat_page', { groupId: g.id })} />)}
            </List>
          )}
        </PageState>
      )}
    </PageScaffold>
  );
}
