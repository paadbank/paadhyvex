'use client';

import { useNav } from '@academix-admin/navigation-stack';
import { useMyCycles } from '@/lib/stacks/data';
import { label, shortDate } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Badge, List, Row } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { PlusIcon } from '@/components/ui/icons';

export default function CyclePage() {
  const nav = useNav();
  const cycles = useMyCycles();
  const logPeriod = () => nav.push('cycle_form_page');

  return (
    <PageScaffold title="Cycle tracking" actions={[{ icon: <PlusIcon />, onClick: logPeriod, ariaLabel: 'Log a period' }]}>
      <PageState
        status={statusOf(cycles, 'your cycles', {
          when: (d) => d.length === 0,
          title: 'Nothing logged yet',
          body: 'Log your period to start seeing your history here. Only you and the people supporting you can see it.',
          action: <Button onClick={logPeriod}>Log a period</Button>,
        })}
      >
        {() => (
          <List>
            {cycles.data!.map((cycle) => {
              const meta = [
                cycle.end_date ? `Ended ${shortDate(cycle.end_date)}` : 'Ongoing',
                cycle.flow_intensity && `${label(cycle.flow_intensity)} flow`,
                cycle.mood && label(cycle.mood),
              ].filter(Boolean).join(', ');
              return (
                <Row key={cycle.id} title={shortDate(cycle.start_date)} meta={meta} trailing={<Badge value={cycle.status} />} onClick={() => nav.push('cycle_form_page', { id: cycle.id })} />
              );
            })}
          </List>
        )}
      </PageState>
    </PageScaffold>
  );
}
