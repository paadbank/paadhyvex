'use client';

import { excerpt, shortDate } from '@/lib/format';
import type { Story } from '@/lib/types';
import { FilterBar } from '@/components/ui/controls';
import { PinIcon } from '@/components/ui/icons';
import { MediaCarousel, StoryThumb } from './story-media';
import styles from './stories.module.css';

/** The story categories in use, spelled as first written. */
export function storyCategories(stories: Story[]) {
  const seen = new Map<string, string>();
  for (const story of stories) {
    const category = story.category?.trim();
    if (category && !seen.has(category.toLowerCase())) seen.set(category.toLowerCase(), category);
  }
  return [{ value: 'all', label: 'All' }, ...[...seen].map(([value, label]) => ({ value, label }))];
}

export function inCategory(stories: Story[], category: string) {
  return category === 'all' ? stories : stories.filter((s) => s.category?.trim().toLowerCase() === category);
}

export function CategoryFilter({ stories, value, onChange }: { stories: Story[]; value: string; onChange: (value: string) => void }) {
  const options = storyCategories(stories);
  return options.length > 1 ? <FilterBar value={value} options={options} onChange={onChange} /> : null;
}

export function StoryCard({ story, onOpen, lead = false }: { story: Story; onOpen: () => void; lead?: boolean }) {
  return (
    <button type="button" className={styles.card} data-lead={lead || undefined} onClick={onOpen}>
      <span className={styles.cardMedia}><StoryThumb media={story.story_media[0]} title={story.title} /></span>
      <span className={styles.cardText}>
        {story.category && <span className={styles.category}>{story.category}</span>}
        <span className={styles.cardTitle}>{story.title}</span>
        {story.location && <span className={styles.place}><PinIcon size="14px" /> {story.location}</span>}
        {lead && <span className={styles.excerpt}>{excerpt(story.story_text, 180)}</span>}
      </span>
    </button>
  );
}

/** The newest story large, the rest beside or under it. */
export function StoryGrid({ stories, onOpen }: { stories: Story[]; onOpen: (story: Story) => void }) {
  return (
    <div className={styles.grid}>
      {stories.map((story, i) => <StoryCard key={story.id} story={story} lead={i === 0} onOpen={() => onOpen(story)} />)}
    </div>
  );
}

/** A sideways row, for the dashboard. */
export function StoryStrip({ stories, onOpen }: { stories: Story[]; onOpen: (id: string) => void }) {
  return (
    <div className={styles.strip}>
      {stories.map((story) => <StoryCard key={story.id} story={story} onOpen={() => onOpen(story.id)} />)}
    </div>
  );
}

/** A whole story: its media, its words and the people in it. */
export function StoryBody({ story, heading = true }: { story: Story; heading?: boolean }) {
  return (
    <article className={styles.story}>
      <MediaCarousel key={story.id} media={story.story_media} title={story.title} />
      <div className={styles.storyText}>
        {story.category && <span className={styles.category}>{story.category}</span>}
        {heading && <h1>{story.title}</h1>}
        <div className={styles.byline}>
          {story.location && <span className={styles.place}><PinIcon size="14px" /> {story.location}</span>}
          <time dateTime={story.created_at}>{shortDate(story.created_at)}</time>
        </div>
        <p>{story.story_text}</p>
        {story.story_members.length > 0 && (
          <div className={styles.people}>
            <h2>People in this story</h2>
            <ul>{story.story_members.map((m) => <li key={m.id}>{m.fullname}</li>)}</ul>
          </div>
        )}
      </div>
    </article>
  );
}
