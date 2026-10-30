'use client';

import { useMemo, useState } from 'react';
import { useDistributions, useExpenses } from '@/lib/stacks/data';
import { label, naira, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { List, Row, Stats } from '@/components/ui/display';
import { FilterBar } from '@/components/ui/controls';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'salaries', label: 'Salaries' },
];

export default function LedgerPage() {
  const expenses = useExpenses();
  const distributions = useDistributions();
  const [filter, setFilter] = useState('all');

  const entries = useMemo(
    () =>
      [
        ...(expenses.data ?? []).map((e) => ({ id: e.id, kind: 'expense', category: e.category, date: e.date_of_allocation, amount: Number(e.amount_spent), title: label(e.category), meta: e.notes })),
        ...(distributions.data ?? []).map((d) => ({
          id: d.id,
          kind: 'delivery',
          category: 'distribution',
          date: d.distribution_date,
          amount: Number(d.delivery_cost ?? 0),
          title: `Delivery to ${d.beneficiary?.full_name ?? 'unknown'}`,
          meta: d.distributor?.full_name ? `Distributor: ${d.distributor.full_name}` : d.notes,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses.data, distributions.data],
  );

  const totalExpenses = entries.filter((e) => e.kind === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const totalDelivery = entries.filter((e) => e.kind === 'delivery').reduce((sum, e) => sum + e.amount, 0);
  const shown = filter === 'all' ? entries : entries.filter((e) => e.category === filter);

  return (
    <PageScaffold title="Ledger">
      <PageState status={statusOf(expenses, 'the ledger')}>
        {() => (
          <>
            <Stats
              stats={[
                { label: 'Grand total', value: naira(totalExpenses + totalDelivery) },
                { label: 'Expenses', value: naira(totalExpenses) },
                { label: 'Delivery costs', value: naira(totalDelivery) },
              ]}
            />
            <FilterBar value={filter} options={FILTERS} onChange={setFilter} />
            <List>
              {shown.map((entry) => (
                <Row key={`${entry.kind}:${entry.id}`} title={entry.title} meta={[shortDate(entry.date), entry.meta].filter(Boolean).join(', ')} trailing={naira(entry.amount)} />
              ))}
            </List>
          </>
        )}
      </PageState>
    </PageScaffold>
  );
}
