'use client';

import { useNav, usePageLifecycle } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useResource } from '@/lib/stacks/resource';
import { must, useNotifications, useProfile, usePublishedStories } from '@/lib/stacks/data';
import { count, longDate, naira, shortDate } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { Loading, PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Avatar, Section, Stats, type Stat } from '@/components/ui/display';
import { Button } from '@/components/ui/controls';
import { BellIcon } from '@/components/ui/icons';
import { StoryStrip } from '@/components/stories/story-cards';
import styles from './dashboard.module.css';

/** Each role sees the figures its work turns on. The first one leads the page. */
async function readStats(profile: Profile): Promise<Stat[]> {
  const db = supabaseBrowser;
  const id = profile.id;
  const rows = async <T,>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> => must(await query) ?? [];
  const people = async (role: string) => {
    const { count: total, error } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role);
    if (error) throw new Error(error.message);
    return total ?? 0;
  };

  switch (profile.role) {
    case 'beneficiary': {
      const [cycles, distributions, unread] = await Promise.all([
        rows(db.from('cycle_logs').select('id').eq('beneficiary_id', id)),
        rows(db.from('distributions').select('id').eq('beneficiary_id', id)),
        rows(db.from('notifications').select('id').eq('recipient_id', id).eq('is_read', false)),
      ]);
      return [
        { label: 'Next period', value: shortDate(profile.next_period_date) || 'Not predicted yet' },
        { label: 'Cycles logged', value: count(cycles.length) },
        { label: 'Distributions', value: count(distributions.length) },
        { label: 'Unread alerts', value: count(unread.length) },
      ];
    }
    case 'distributor': {
      const [distributions, beneficiaries] = await Promise.all([
        rows<{ status: string }>(db.from('distributions').select('status').eq('distributor_id', id)),
        rows(db.from('profiles').select('id').eq('assigned_distributor_id', id)),
      ]);
      return [
        { label: 'Pending distributions', value: count(distributions.filter((d) => d.status === 'pending').length) },
        { label: 'Assigned beneficiaries', value: count(beneficiaries.length) },
        { label: 'All distributions', value: count(distributions.length) },
      ];
    }
    case 'sales': {
      const expenses = await rows<{ amount_given: number; amount_spent: number }>(db.from('expense_records').select('amount_given, amount_spent'));
      const given = expenses.reduce((sum, e) => sum + Number(e.amount_given), 0);
      const spent = expenses.reduce((sum, e) => sum + Number(e.amount_spent), 0);
      return [
        { label: 'Balance', value: naira(given - spent), tone: given - spent < 0 ? 'negative' : undefined },
        { label: 'Total given', value: naira(given) },
        { label: 'Total spent', value: naira(spent) },
        { label: 'Expense records', value: count(expenses.length) },
      ];
    }
    case 'logger': {
      const [cycles, beneficiaries] = await Promise.all([rows<{ created_at: string; status: string }>(db.from('cycle_logs').select('created_at, status')), people('beneficiary')]);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return [
        { label: 'Open cycles', value: count(cycles.filter((c) => c.status === 'open').length) },
        { label: 'Logged in 7 days', value: count(cycles.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length) },
        { label: 'All cycles', value: count(cycles.length) },
        { label: 'Beneficiaries', value: count(beneficiaries) },
      ];
    }
    case 'admin':
    case 'super_admin':
    case 'manager': {
      const [beneficiaries, distributors, distributions, expenses] = await Promise.all([
        people('beneficiary'),
        people('distributor'),
        rows<{ num_pads: number }>(db.from('distributions').select('num_pads')),
        rows<{ amount_spent: number }>(db.from('expense_records').select('amount_spent')),
      ]);
      return [
        { label: 'Beneficiaries', value: count(beneficiaries) },
        { label: 'Distributors', value: count(distributors) },
        { label: 'Distributions', value: count(distributions.length) },
        { label: 'Total expenses', value: naira(expenses.reduce((sum, e) => sum + Number(e.amount_spent), 0)) },
      ];
    }
    default:
      return [];
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const nav = useNav();
  const profile = useProfile();
  const stories = usePublishedStories();
  const notifications = useNotifications();
  const stats = useResource<Stat[]>({
    key: `dashboard:${profile.data?.id}:${profile.data?.role}`,
    scope: 'dashboard',
    enabled: Boolean(profile.data),
    deps: [profile.data?.id, profile.data?.role],
    read: () => readStats(profile.data!),
  });

  usePageLifecycle(nav, { onResume: () => { stats.reload(); notifications.reload(); } }, [stats.reload, notifications.reload]);

  const firstName = profile.data?.full_name?.split(' ')[0];
  const unread = notifications.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <PageScaffold
      title={firstName ? `${greeting()}, ${firstName}` : greeting()}
      subtitle={longDate(new Date())}
      actions={[{ icon: <BellIcon />, onClick: () => void nav.goToGroupId('notifications-stack'), ariaLabel: unread ? `Alerts, ${unread} unread` : 'Alerts', badge: unread ? (unread > 9 ? '9+' : unread) : undefined }]}
      trailing={
        <button type="button" className={styles.me} aria-label="Your profile" onClick={() => void nav.goToGroupId('profile-stack')}>
          <Avatar name={profile.data?.full_name} />
        </button>
      }
    >
      <PageState status={statusOf(stats, 'your figures')}>
        {() => (stats.data!.length > 0 ? <Stats stats={stats.data!} /> : null)}
      </PageState>
      {stories.loaded && (stories.data?.length ?? 0) > 0 ? (
        <Section title="From the field" action={<Button variant="quiet" onClick={() => nav.push('stories_view_page')}>View all</Button>}>
          <StoryStrip stories={stories.data!.slice(0, 8)} onOpen={(id) => nav.push('story_detail_page', { id })} />
        </Section>
      ) : stories.loading && !stories.loaded ? (
        <Loading />
      ) : null}
    </PageScaffold>
  );
}
