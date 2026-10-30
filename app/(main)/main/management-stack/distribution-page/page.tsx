'use client';

import { useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useDistributions, useRole } from '@/lib/stacks/data';
import { count, label, naira, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Badge, List, Row } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';
import { PlusIcon } from '@/components/ui/icons';

export default function DistributionPage() {
  const nav = useNav();
  const role = useRole();
  const distributions = useDistributions();
  const { submit, dialog } = useSubmit();

  const canCreate = role === 'distributor' || role === 'manager' || role === 'admin';

  const setStatus = (id: string, status: string) =>
    submit(async () => {
      must(await supabaseBrowser.from('distributions').update({ status }).eq('id', id));
      changed('distributions');
    });

  const create = () => nav.push('distribution_form_page');

  return (
    <PageScaffold title="Distributions" actions={canCreate ? [{ icon: <PlusIcon />, onClick: create, ariaLabel: 'New distribution' }] : undefined}>
      <PageState
        status={statusOf(distributions, 'distributions', {
          when: (d) => d.length === 0,
          title: 'No distributions yet',
          action: canCreate ? <Button onClick={create}>New distribution</Button> : undefined,
        })}
      >
        {() => (
          <List>
            {distributions.data!.map((d) => {
              const meta = `${count(d.num_pads)} pads on ${shortDate(d.distribution_date)}\n${label(d.transport_mode)}${d.delivery_cost ? `, ${naira(d.delivery_cost)}` : ''}`;
              const actions = d.status === 'pending' && canCreate;
              return (
                <Row
                  key={d.id}
                  title={d.beneficiary?.full_name ?? 'Unknown beneficiary'}
                  meta={meta}
                  trailing={<Badge value={d.status} />}
                  onClick={canCreate ? () => nav.push('distribution_form_page', { id: d.id }) : undefined}
                >
                  {actions && <Button variant="secondary" onClick={() => setStatus(d.id, 'in_transit')}>Mark in transit</Button>}
                  {actions && <Button variant="secondary" onClick={() => setStatus(d.id, 'completed')}>Mark completed</Button>}
                </Row>
              );
            })}
          </List>
        )}
      </PageState>
      {dialog}
    </PageScaffold>
  );
}
