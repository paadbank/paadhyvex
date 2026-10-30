'use client';

import { useLocation } from '@academix-admin/navigation-stack';
import { usePublishedStories } from '@/lib/stacks/data';
import { PageScaffold, PageState, statusOf } from '@/components/ui/page';
import { StoryBody } from '@/components/stories/story-cards';

export default function StoryDetailPage() {
  const id = useLocation()?.params?.id as string | undefined;
  const stories = usePublishedStories();
  const story = stories.data?.find((s) => s.id === id);

  return (
    <PageScaffold title={story?.title ?? 'Story'}>
      <PageState status={statusOf(stories, 'this story', { when: () => !story, title: 'This story is no longer published' })}>
        {() => <StoryBody story={story!} heading={false} />}
      </PageState>
    </PageScaffold>
  );
}
