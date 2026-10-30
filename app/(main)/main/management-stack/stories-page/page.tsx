'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { changed, must, useAllStories, useFounderStory } from '@/lib/stacks/data';
import { count, excerpt } from '@/lib/format';
import type { Story } from '@/lib/types';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { Badge, Columns, Facts, List, Row } from '@/components/ui/display';
import { Button, Segmented } from '@/components/ui/controls';
import { useSubmit } from '@/components/ui/dialogs';
import { PenIcon, PlusIcon } from '@/components/ui/icons';

const TABS = [
  { value: 'posts', label: 'Story posts' },
  { value: 'founder', label: 'Founder story' },
];

export default function StoriesPage() {
  const nav = useNav();
  const stories = useAllStories();
  const founder = useFounderStory();
  const [tab, setTab] = useState('posts');
  const { submit, dialog } = useSubmit();

  const togglePublish = (story: Story) =>
    submit(async () => {
      must(await supabaseBrowser.from('stories').update({ is_published: !story.is_published }).eq('id', story.id));
      changed('stories');
    });

  const create = () => nav.push('story_form_page');
  const editFounder = () => nav.push('founder_form_page');
  const story = founder.data && founder.data.id ? (founder.data as Exclude<typeof founder.data, { id: null }>) : null;

  return (
    <PageScaffold
      title="Stories"
      actions={tab === 'posts' ? [{ icon: <PlusIcon />, onClick: create, ariaLabel: 'Add story' }] : [{ icon: <PenIcon />, onClick: editFounder, ariaLabel: 'Edit founder story' }]}
    >
      <Segmented value={tab} options={TABS} onChange={setTab} />

      {tab === 'posts' ? (
        <PageState status={statusOf(stories, 'stories', { when: (d) => d.length === 0, title: 'No stories yet', action: <Button onClick={create}>Add story</Button> })}>
          {() => (
            <List>
              {stories.data!.map((s) => (
                <Row
                  key={s.id}
                  title={s.title}
                  meta={[s.location, s.category, `${count(s.story_media.length)} media`, `${count(s.story_members.length)} people`].filter(Boolean).join(', ')}
                  trailing={<Badge value={s.is_published ? 'published' : 'draft'} />}
                  onClick={() => nav.push('story_form_page', { id: s.id })}
                >
                  <Button variant="secondary" onClick={() => togglePublish(s)}>{s.is_published ? 'Move to draft' : 'Publish'}</Button>
                </Row>
              ))}
            </List>
          )}
        </PageState>
      ) : (
        <PageState status={statusOf(founder, 'the founder story', { when: (d) => !d.id, title: 'No founder story yet', action: <Button onClick={editFounder}>Add founder story</Button> })}>
          {() => (
            <Columns
              main={<p>{excerpt(story!.description, 900)}</p>}
              side={<Facts items={[['Title', story!.title], ['Written by', story!.founder_name], ['Date', story!.founder_date]]} />}
            />
          )}
        </PageState>
      )}

      {dialog}
    </PageScaffold>
  );
}
