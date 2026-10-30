'use client';

import { useNav, usePageLifecycle } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useNotifications } from '@/lib/stacks/data';
import { dateTime } from '@/lib/format';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { List, Row } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';

export default function NotificationsPage() {
  const nav = useNav();
  const notifications = useNotifications();
  const { submit, dialog } = useSubmit();

  usePageLifecycle(nav, { onResume: () => notifications.reload() }, [notifications.reload]);

  const markRead = (id: string) =>
    submit(async () => {
      must(await supabaseBrowser.from('notifications').update({ is_read: true }).eq('id', id));
      changed('notifications');
    });

  return (
    <PageScaffold title="Alerts">
      <PageState status={statusOf(notifications, 'alerts', { when: (d) => d.length === 0, title: 'Nothing new', body: 'Updates about your pads and messages will show up here.' })}>
        {() => (
          <List>
            {notifications.data!.map((n) => (
              <Row key={n.id} title={n.title} meta={<>{n.message}<br />{dateTime(n.created_at)}</>}>
                {!n.is_read && <Button variant="quiet" onClick={() => markRead(n.id)}>Mark as read</Button>}
              </Row>
            ))}
          </List>
        )}
      </PageState>
      {dialog}
    </PageScaffold>
  );
}
