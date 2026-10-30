'use client';

import { useNav } from '@academix-admin/navigation-stack';
import { useExpenses } from '@/lib/stacks/data';
import { label, naira, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { List, Row } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { PlusIcon } from '@/components/ui/icons';

export default function TransactionsPage() {
  const nav = useNav();
  const transactions = useExpenses();
  const create = () => nav.push('expense_form_page');

  return (
    <PageScaffold title="Transactions" actions={[{ icon: <PlusIcon />, onClick: create, ariaLabel: 'New transaction' }]}>
      <PageState
        status={statusOf(transactions, 'transactions', {
          when: (d) => d.length === 0,
          title: 'No transactions yet',
          action: <Button onClick={create}>New transaction</Button>,
        })}
      >
        {() => (
          <List>
            {transactions.data!.map((tx) => (
              <Row
                key={tx.id}
                title={label(tx.category)}
                meta={[`Given ${naira(tx.amount_given)} on ${shortDate(tx.date_of_allocation)}`, `Balance ${naira(tx.remaining_balance)}`, tx.notes].filter(Boolean).join('\n')}
                trailing={naira(tx.amount_spent)}
              />
            ))}
          </List>
        )}
      </PageState>
    </PageScaffold>
  );
}
