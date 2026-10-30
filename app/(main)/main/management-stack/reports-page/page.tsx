'use client';

import { useState } from 'react';
import { useDistributions, useExpenses, useUsers } from '@/lib/stacks/data';
import { count, label, naira, shortDate, today } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Badge, List, Row, Stats, type Stat } from '@/components/ui/display';
import { FilterBar } from '@/components/ui/controls';
import { DownloadIcon } from '@/components/ui/icons';

const REPORTS = [
  { value: 'distributions', label: 'Distributions' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'users', label: 'Users' },
];

function download(name: string, rows: object[]) {
  if (rows.length === 0) return;
  const first = rows[0] as Record<string, unknown>;
  const headers = Object.keys(first).filter((k) => typeof first[k] !== 'object' || first[k] === null);
  const cell = (value: unknown) => JSON.stringify(value ?? '');
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => cell((row as Record<string, unknown>)[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}_report_${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [report, setReport] = useState('distributions');
  const distributions = useDistributions();
  const expenses = useExpenses();
  const users = useUsers();
  const res = report === 'distributions' ? distributions : report === 'expenses' ? expenses : users;

  const exportCsv = () => download(report, res.data ?? []);

  let stats: Stat[] = [];
  if (report === 'distributions' && distributions.data) {
    const d = distributions.data;
    stats = [
      { label: 'Pads distributed', value: count(d.reduce((sum, x) => sum + x.num_pads, 0)) },
      { label: 'Distributions', value: count(d.length) },
      { label: 'Pending', value: count(d.filter((x) => x.status === 'pending').length) },
      { label: 'Completed', value: count(d.filter((x) => x.status === 'completed').length) },
    ];
  } else if (report === 'expenses' && expenses.data) {
    const given = expenses.data.reduce((sum, e) => sum + Number(e.amount_given), 0);
    const spent = expenses.data.reduce((sum, e) => sum + Number(e.amount_spent), 0);
    stats = [
      { label: 'Balance', value: naira(given - spent), tone: given - spent < 0 ? 'negative' : undefined },
      { label: 'Total given', value: naira(given) },
      { label: 'Total spent', value: naira(spent) },
      { label: 'Records', value: count(expenses.data.length) },
    ];
  } else if (report === 'users' && users.data) {
    const u = users.data;
    stats = [
      { label: 'Users', value: count(u.length) },
      { label: 'Beneficiaries', value: count(u.filter((x) => x.role === 'beneficiary').length) },
      { label: 'Distributors', value: count(u.filter((x) => x.role === 'distributor').length) },
      { label: 'Pending', value: count(u.filter((x) => x.status === 'pending').length) },
    ];
  }

  return (
    <PageScaffold title="Reports" actions={[{ icon: <DownloadIcon />, onClick: exportCsv, ariaLabel: 'Export CSV', disabled: !res.data?.length }]}>
      <FilterBar value={report} options={REPORTS} onChange={setReport} />
      <PageState status={statusOf<unknown[]>(res as never, `the ${report} report`, { when: (d) => d.length === 0, title: `No ${report} to report yet` })}>
        {() => (
          <>
            <Stats stats={stats} />
            <List>
              {report === 'distributions' &&
                distributions.data!.map((d) => (
                  <Row key={d.id} title={d.beneficiary?.full_name ?? 'Unknown beneficiary'} meta={`${shortDate(d.distribution_date)}, ${count(d.num_pads)} pads`} trailing={<Badge value={d.status} />} />
                ))}
              {report === 'expenses' &&
                expenses.data!.map((e) => <Row key={e.id} title={label(e.category)} meta={`${shortDate(e.date_of_allocation)}, given ${naira(e.amount_given)}`} trailing={naira(e.amount_spent)} />)}
              {report === 'users' &&
                users.data!.map((u) => <Row key={u.id} title={u.full_name} meta={[label(u.role), u.email].filter(Boolean).join(', ')} trailing={<Badge value={u.status} />} />)}
            </List>
          </>
        )}
      </PageState>
    </PageScaffold>
  );
}
