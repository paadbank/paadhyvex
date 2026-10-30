'use client';

import type { ReactNode } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { useLanguage } from '@/context/LanguageContext';
import { useProfile } from '@/lib/stacks/data';
import { useGirlsToReach } from '@/lib/reach';
import { count } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { List, Row } from '@/components/ui/display';
import { BookIcon, CameraIcon, ChartIcon, ChatIcon, PackageIcon, PenIcon, PeopleIcon, ReceiptIcon, ShieldIcon, WalletIcon } from '@/components/ui/icons';

type Item = { route: string; title: string; meta: string; icon: ReactNode };

export default function ManagementHome() {
  const nav = useNav();
  const { t } = useLanguage();
  const profile = useProfile();
  const role = profile.data?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const girlsToReach = useGirlsToReach();

  const items: Item[] = [
    { route: 'distribution_page', title: t('distributions') || 'Distributions', meta: 'Pad distributions and deliveries', icon: <PackageIcon /> },
    ...(isAdmin
      ? [
          { route: 'stories_page', title: 'Stories', meta: 'Field photos, videos and the founder story', icon: <CameraIcon /> },
          { route: 'expenses_page', title: t('expenses') || 'Expenses', meta: 'Money given and spent', icon: <WalletIcon /> },
          { route: 'reports_page', title: t('reports') || 'Reports', meta: 'Figures and CSV exports', icon: <ChartIcon /> },
          { route: 'admin_page', title: 'Users', meta: 'Accounts, roles and approvals', icon: <ShieldIcon /> },
          { route: 'reach_page', title: 'Girls yet to reach', meta: girlsToReach === null ? 'Set the X shown on the public site' : `${count(girlsToReach)} on the public site`, icon: <PeopleIcon /> },
        ]
      : [{ route: 'stories_view_page', title: 'Stories', meta: 'Field stories and updates', icon: <CameraIcon /> }]),
    { route: 'messaging_page', title: t('messages') || 'Messages', meta: 'Contacts and groups', icon: <ChatIcon /> },
    ...(role === 'logger' ? [{ route: 'log_cycle_page', title: 'Log cycles', meta: 'Log a cycle for a beneficiary', icon: <PenIcon /> }] : []),
    ...(role === 'sales'
      ? [
          { route: 'transactions_page', title: 'Transactions', meta: 'Purchases and sales', icon: <ReceiptIcon /> },
          { route: 'ledger_page', title: 'Ledger', meta: 'Expenses and delivery costs together', icon: <BookIcon /> },
        ]
      : []),
  ];

  return (
    <PageScaffold title="Manage">
      <PageState status={statusOf(profile, 'your workspace')}>
        {() => (
          <List>
            {items.map((item) => (
              <Row key={item.route} leading={item.icon} title={item.title} meta={item.meta} onClick={() => nav.push(item.route)} />
            ))}
          </List>
        )}
      </PageState>
    </PageScaffold>
  );
}
