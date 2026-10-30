'use client';

import { useState } from 'react';
import { useNav } from '@academix-admin/navigation-stack';
import { usePublishedStories } from '@/lib/stacks/data';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { CategoryFilter, StoryGrid, inCategory } from '@/components/stories/story-cards';

export default function StoriesViewPage() {
  const nav = useNav();
  const stories = usePublishedStories();
  const [category, setCategory] = useState('all');

  return (
    <PageScaffold title="Stories">
      <PageState status={statusOf(stories, 'stories', { when: (d) => d.length === 0, title: 'No stories yet', body: 'Field stories will appear here once they are published.' })}>
        {() => (
          <>
            <CategoryFilter stories={stories.data!} value={category} onChange={setCategory} />
            <StoryGrid stories={inCategory(stories.data!, category)} onOpen={(story) => nav.push('story_detail_page', { id: story.id })} />
          </>
        )}
      </PageState>
    </PageScaffold>
  );
}
