'use client';

import { useNav } from '@academix-admin/navigation-stack';
import { useExpenses, useRole } from '@/lib/stacks/data';
import { label, naira, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { List, Row, Stats } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { PlusIcon } from '@/components/ui/icons';

export default function ExpensesPage() {
  const nav = useNav();
  const role = useRole();
  const expenses = useExpenses();
  const canCreate = role === 'sales' || role === 'manager' || role === 'admin';

  const create = () => nav.push('expense_form_page');

  return (
    <PageScaffold title="Expenses" actions={canCreate ? [{ icon: <PlusIcon />, onClick: create, ariaLabel: 'New expense' }] : undefined}>
      <PageState
        status={statusOf(expenses, 'expenses', {
          when: (d) => d.length === 0,
          title: 'No expenses yet',
          action: canCreate ? <Button onClick={create}>New expense</Button> : undefined,
        })}
      >
        {() => {
          const given = expenses.data!.reduce((sum, e) => sum + Number(e.amount_given), 0);
          const spent = expenses.data!.reduce((sum, e) => sum + Number(e.amount_spent), 0);
          const balance = given - spent;
          return (
            <>
              <Stats
                stats={[
                  { label: 'Balance', value: naira(balance), tone: balance < 0 ? 'negative' : undefined },
                  { label: 'Total given', value: naira(given) },
                  { label: 'Total spent', value: naira(spent) },
                ]}
              />
              <List>
                {expenses.data!.map((e) => (
                  <Row
                    key={e.id}
                    title={label(e.category)}
                    meta={[`Given ${naira(e.amount_given)} on ${shortDate(e.date_of_allocation)}`, e.recorded_by_profile?.full_name && `Recorded by ${e.recorded_by_profile.full_name}`, e.notes].filter(Boolean).join('\n')}
                    trailing={naira(e.amount_spent)}
                    onClick={canCreate ? () => nav.push('expense_form_page', { id: e.id }) : undefined}
                  />
                ))}
              </List>
            </>
          );
        }}
      </PageState>
    </PageScaffold>
  );
}
