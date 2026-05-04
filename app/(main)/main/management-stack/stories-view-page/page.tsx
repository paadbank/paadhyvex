'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNav } from '@/lib/NavigationStack';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import EmptyRecord from '@/components/EmptyRecord/EmptyRecord';
import styles from './page.module.css';

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type StoryMember = { id: string; fullname: string };
type Story = {
  id: string; title: string; location: string; story_text: string;
  category: string; created_at: string;
  story_media: StoryMedia[]; story_members: StoryMember[];
};

function getFileId(url: string) { const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : null; }
function driveImg(url: string) { const id = getFileId(url); return id ? `https://lh3.googleusercontent.com/d/${id}` : url; }
function driveEmbed(url: string) { const id = getFileId(url); return id ? `https://drive.google.com/file/d/${id}/preview` : url; }

function MediaCarousel({ media, title }: { media: StoryMedia[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (media.length === 0) return <div className={styles.detailMediaEmpty}><span>📷</span></div>;
  const cur = media[idx];
  return (
    <div className={styles.detailCarousel}>
      <div className={styles.detailCarouselFrame}>
        {cur.type === 'video' ? (
          <iframe src={driveEmbed(cur.link)} className={styles.detailIframe} allow="autoplay; fullscreen" allowFullScreen title={title} />
        ) : (
          <img src={driveImg(cur.link)} alt={title} className={styles.detailImg} />
        )}
      </div>
      {media.length > 1 && (
        <div className={styles.detailCarouselNav}>
          {media.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`${styles.detailDot} ${i === idx ? styles.detailDotActive : ''}`} aria-label={`Media ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryDetail({ story, onBack, onPrev, onNext, hasPrev, hasNext, counter }: {
  story: Story; onBack: () => void;
  onPrev: () => void; onNext: () => void;
  hasPrev: boolean; hasNext: boolean; counter: string;
}) {
  const { theme } = useTheme();
  useEffect(() => { window.scrollTo(0, 0); }, [story.id]);

  return (
    <div className={`${styles.detailPage} ${styles[`detailPage_${theme}`]}`}>
      <header className={`${styles.detailHeader} ${styles[`detailHeader_${theme}`]}`}>
        <div className={styles.detailHeaderContent}>
          <button className={styles.detailBackBtn} onClick={onBack}>
            <svg className={styles.detailBackIcon} viewBox="0 0 16 22" fill="none">
              <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
            </svg>
          </button>
          <h1 className={styles.detailHeaderTitle}>{story.title}</h1>
          <div className={styles.detailHeaderNav}>
            <button onClick={onPrev} disabled={!hasPrev} className={styles.detailNavBtn}>‹</button>
            <span className={styles.detailCounter}>{counter}</span>
            <button onClick={onNext} disabled={!hasNext} className={styles.detailNavBtn}>›</button>
          </div>
        </div>
      </header>

      <div className={styles.detailBody}>
        <div className={styles.detailMediaWrap}>
          <MediaCarousel media={story.story_media} title={story.title} />
        </div>

        <div className={styles.detailContent}>
          <div className={styles.detailMeta}>
            {story.category && <span className={styles.detailTag}>{story.category}</span>}
            <span className={styles.detailDate}>{new Date(story.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h2 className={styles.detailTitle}>{story.title}</h2>
          {story.location && (
            <p className={styles.detailLocation}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {story.location}
            </p>
          )}
          <p className={styles.detailText}>{story.story_text}</p>

          {story.story_members.length > 0 && (
            <div className={styles.detailMembers}>
              <p className={styles.detailMembersLabel}>People in this story</p>
              <div className={styles.detailMembersList}>
                {story.story_members.map(m => <span key={m.id} className={styles.detailMemberChip}>{m.fullname}</span>)}
              </div>
            </div>
          )}

          <div className={styles.detailFooterNav}>
            <button onClick={onPrev} disabled={!hasPrev} className={styles.detailFooterBtn}>← Previous</button>
            <button onClick={onNext} disabled={!hasNext} className={styles.detailFooterBtn}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesViewPage() {
  const nav = useNav();
  const { theme } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Story | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    supabaseBrowser.from('stories').select('*, story_media(*), story_members(*)')
      .eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setStories((data || []) as Story[]); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? stories : stories.filter(s => s.category === filter);
  const categories = ['all', ...Array.from(new Set(stories.map(s => s.category).filter(Boolean)))];

  const openStory = (story: Story) => {
    setSelected(story);
    setSelectedIndex(filtered.findIndex(s => s.id === story.id));
  };

  const navigate = useCallback((dir: 1 | -1) => {
    const next = selectedIndex + dir;
    if (next >= 0 && next < filtered.length) { setSelected(filtered[next]); setSelectedIndex(next); }
  }, [selectedIndex, filtered]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, navigate]);

  // Full-page detail view
  if (selected) {
    return (
      <StoryDetail
        story={selected}
        onBack={() => setSelected(null)}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex < filtered.length - 1}
        counter={`${selectedIndex + 1} / ${filtered.length}`}
      />
    );
  }

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <div>
            <button className={styles.backButton} onClick={() => nav.pop()} aria-label="Go back">
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none">
                <path d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z" fill="currentColor" />
              </svg>
            </button>
            <h1 className={styles.title}>Stories</h1>
          </div>
        </div>
      </header>

      <div className={styles.innerBody}>
        {categories.length > 1 && (
          <div className={styles.filtersWrap}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyRecord message="No stories yet" onReload={() => {}} theme={theme} />
        ) : (
          <div className={styles.storyList}>
            {filtered.map(story => {
              const thumb = story.story_media[0];
              return (
                <div key={story.id} className={`${styles.card} ${styles[`card_${theme}`]}`}
                  onClick={() => openStory(story)} role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && openStory(story)}>
                  <div className={styles.cardThumb}>
                    {!thumb ? <span className={styles.thumbPlaceholder}>📷</span>
                      : thumb.type === 'video' ? (
                        <div className={styles.thumbVideo}><div className={styles.thumbPlay}><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
                      ) : (
                        <img src={driveImg(thumb.link)} alt={story.title} className={styles.thumbImg} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    {story.story_media.length > 1 && <span className={styles.mediaCountBadge}>+{story.story_media.length - 1}</span>}
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardMeta}>
                      {story.category && <span className={styles.tag}>{story.category}</span>}
                      <span className={styles.cardDate}>{new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{story.title}</h3>
                    {story.location && <p className={styles.cardLocation}>📍 {story.location}</p>}
                    <p className={styles.cardExcerpt}>{story.story_text.length > 120 ? story.story_text.slice(0, 120) + '…' : story.story_text}</p>
                    {story.story_members.length > 0 && (
                      <p className={styles.cardMembers}>👤 {story.story_members.slice(0, 2).map(m => m.fullname).join(', ')}{story.story_members.length > 2 ? ` +${story.story_members.length - 2}` : ''}</p>
                    )}
                  </div>
                  <div className={styles.cardArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
