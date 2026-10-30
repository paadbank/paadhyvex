'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOverlayRoute } from '@academix-admin/navigation-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { excerpt } from '@/lib/format';
import type { FounderStory, Story } from '@/lib/types';
import { SiteFooter, SiteHeader } from '@/components/public/site';
import { CategoryFilter, StoryBody, StoryGrid, inCategory } from '@/components/stories/story-cards';
import { Button } from '@/components/ui/controls';
import { BackChevronIcon, ChevronIcon } from '@/components/ui/icons';
import { Loading } from '@/components/ui/page';
import styles from '../public-page.module.css';

const FOUNDER_PREVIEW = 320;

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [founder, setFounder] = useState<FounderStory | null>(null);
  const [founderOpen, setFounderOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.from('stories').select('*, story_media(*), story_members(*)').eq('is_published', true).order('created_at', { ascending: false }).order('created_at', { foreignTable: 'story_media', ascending: true })
      .then(({ data, error }) => {
        if (error) setFailed(true);
        setStories((data ?? []) as Story[]);
      });
    supabaseBrowser.from('founder_story').select('*').limit(1).maybeSingle().then(({ data }) => setFounder(data as FounderStory | null));
  }, []);

  const shown = inCategory(stories ?? [], category);
  const index = shown.findIndex((s) => s.id === selectedId);
  const selected = index >= 0 ? shown[index] : null;

  // Back closes the story, not the site.
  const close = useCallback(() => setSelectedId(null), []);
  useOverlayRoute('story', selected !== null, close);

  const step = useCallback(
    (by: 1 | -1) => {
      const next = shown[index + by];
      if (next) setSelectedId(next.id);
    },
    [shown, index],
  );

  useEffect(() => {
    if (!selected) return;
    window.scrollTo(0, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, step, close]);

  return (
    <div className={styles.page}>
      <SiteHeader />
      {selected ? (
        <main className={`${styles.content} ${styles.wide}`} style={{ paddingTop: 'var(--space-6)' }}>
          <div className={styles.detailNav}>
            <Button variant="secondary" onClick={close}><BackChevronIcon size="18px" /> All stories</Button>
            <span className={styles.founderBy}>{index + 1} of {shown.length}</span>
          </div>
          <StoryBody story={selected} />
          <div className={styles.detailNav}>
            <Button variant="quiet" disabled={index === 0} onClick={() => step(-1)}><BackChevronIcon size="18px" /> Previous</Button>
            <Button variant="quiet" disabled={index === shown.length - 1} onClick={() => step(1)}>Next <ChevronIcon size="18px" /></Button>
          </div>
        </main>
      ) : (
        <>
          <div className={`${styles.hero} ${styles.wide}`}>
            <h1 className={styles.title}>Stories from the field</h1>
            <p className={styles.subtitle}>Real moments from schools, communities and interviews: the faces behind our mission.</p>
          </div>
          <main className={`${styles.content} ${styles.wide}`}>
            {founder && (
              <section className={styles.founder}>
                {founder.image_url && <img src={founder.image_url} alt={founder.founder_name} className={styles.founderPhoto} />}
                <h2 className={styles.sectionTitle}>{founder.title}</h2>
                <p className={styles.founderBy}>{founder.founder_name}{founder.founder_date ? `, ${founder.founder_date}` : ''}</p>
                <p className={styles.founderText}>{founderOpen ? founder.description : excerpt(founder.description, FOUNDER_PREVIEW)}</p>
                {founder.description.length > FOUNDER_PREVIEW && (
                  <div><Button variant="quiet" onClick={() => setFounderOpen((v) => !v)}>{founderOpen ? 'Show less' : 'Read the full story'}</Button></div>
                )}
              </section>
            )}
            {stories === null ? (
              <Loading />
            ) : failed ? (
              <p className={styles.text}>Stories could not be loaded. Check your connection and refresh this page.</p>
            ) : shown.length === 0 ? (
              <p className={styles.text}>No stories yet. Check back soon.</p>
            ) : (
              <div className={styles.stories}>
                <CategoryFilter stories={stories} value={category} onChange={setCategory} />
                <StoryGrid stories={shown} onOpen={(story) => setSelectedId(story.id)} />
              </div>
            )}
          </main>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
