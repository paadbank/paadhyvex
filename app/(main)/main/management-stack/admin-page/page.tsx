'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { useRole, useUsers } from '@/lib/stacks/data';
import { label } from '@/lib/format';
import { PageScaffold, PageState, PinnedSection, statusOf } from '@/components/ui/page';
import { Avatar, Badge, List, Row } from '@/components/ui/display';
import { Button, FilterBar } from '@/components/ui/controls';
import { PlusIcon } from '@/components/ui/icons';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'beneficiary', label: 'Beneficiaries' },
  { value: 'distributor', label: 'Distributors' },
  { value: 'sales', label: 'Sales' },
  { value: 'manager', label: 'Managers' },
  { value: 'admin', label: 'Admins' },
];

export default function AdminPage() {
  const nav = useNav();
  const role = useRole();
  const users = useUsers();
  const [filter, setFilter] = useState('all');

  const canManage = role === 'manager' || role === 'admin';
  const create = () => nav.push('user_form_page');
  const shown = (users.data ?? []).filter((u) => filter === 'all' || (filter === 'pending' ? u.status === 'pending' : u.role === filter));

  return (
    <PageScaffold title="Users" actions={canManage ? [{ icon: <PlusIcon />, onClick: create, ariaLabel: 'Create user' }] : undefined}>
      <PinnedSection>
        <FilterBar value={filter} options={FILTERS} onChange={setFilter} />
      </PinnedSection>
      <PageState status={statusOf(users, 'users')}>
        {() =>
          shown.length === 0 ? (
            <PageState status={{ state: 'empty', title: 'No users here', action: canManage ? <Button onClick={create}>Create user</Button> : undefined }}>{() => null}</PageState>
          ) : (
            <List>
              {shown.map((u) => (
                <Row
                  key={u.id}
                  leading={<Avatar name={u.full_name} />}
                  title={u.full_name}
                  meta={[label(u.role), u.location].filter(Boolean).join(', ')}
                  trailing={<Badge value={u.status} />}
                  onClick={() => nav.push('user_page', { id: u.id })}
                />
              ))}
            </List>
          )
        }
      </PageState>
    </PageScaffold>
  );
}
