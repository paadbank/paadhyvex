'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './stories.module.css';

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type StoryMember = { id: string; fullname: string };
type Story = {
  id: string; title: string; location: string; story_text: string;
  category: string; created_at: string;
  story_media: StoryMedia[]; story_members: StoryMember[];
};
type FounderStory = { id: string; title: string; description: string; founder_name: string; founder_date: string; image_url: string; };

function getFileId(url: string) { const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/); return m ? m[1] : null; }
function getImageUrl(url: string) { const id = getFileId(url); return id ? `https://lh3.googleusercontent.com/d/${id}` : url; }
function getEmbedUrl(url: string) { const id = getFileId(url); return id ? `https://drive.google.com/file/d/${id}/preview` : url; }

function MediaCarousel({ media, title }: { media: StoryMedia[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (media.length === 0) return (
    <div className={styles.detailMediaEmpty}>
      <span>📷</span>
    </div>
  );
  const cur = media[idx];
  return (
    <div className={styles.detailCarousel}>
      <div className={styles.detailCarouselFrame}>
        {cur.type === 'video' ? (
          <iframe src={getEmbedUrl(cur.link)} className={styles.detailIframe} allow="autoplay; fullscreen" allowFullScreen title={title} />
        ) : (
          <img src={getImageUrl(cur.link)} alt={title} className={styles.detailImg} />
        )}
        {media.length > 1 && (
          <>
            <button
              className={`${styles.carouselArrowBtn} ${styles.carouselArrowLeft}`}
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              aria-label="Previous media"
            >&#8249;</button>
            <button
              className={`${styles.carouselArrowBtn} ${styles.carouselArrowRight}`}
              onClick={() => setIdx(i => Math.min(media.length - 1, i + 1))}
              disabled={idx === media.length - 1}
              aria-label="Next media"
            >&#8250;</button>
            <div className={styles.carouselCounter}>{idx + 1} / {media.length}</div>
          </>
        )}
      </div>
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
      <nav className={styles.detailNav}>
        <button onClick={onBack} className={styles.detailBackBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div className={styles.detailNavRight}>
          <button onClick={onPrev} disabled={!hasPrev} className={styles.detailNavBtn}>‹ Prev</button>
          <span className={styles.detailCounter}>{counter}</span>
          <button onClick={onNext} disabled={!hasNext} className={styles.detailNavBtn}>Next ›</button>
        </div>
      </nav>

      <div className={styles.detailBody}>
        <div className={styles.detailMediaWrap}>
          <MediaCarousel media={story.story_media} title={story.title} />
        </div>

        <div className={styles.detailContent}>
          <div className={styles.detailMeta}>
            {story.category && <span className={styles.detailTag}>{story.category}</span>}
            <span className={styles.detailDate}>{new Date(story.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className={styles.detailTitle}>{story.title}</h1>
          {story.location && (
            <p className={styles.detailLocation}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
            <button onClick={onPrev} disabled={!hasPrev} className={styles.detailFooterBtn}>← Previous story</button>
            <button onClick={onNext} disabled={!hasNext} className={styles.detailFooterBtn}>Next story →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Story | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [founder, setFounder] = useState<FounderStory | null>(null);
  const [founderExpanded, setFounderExpanded] = useState(false);

  useEffect(() => {
    supabaseBrowser.from('stories').select('*, story_media(*), story_members(*)')
      .eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setStories((data || []) as Story[]); setLoading(false); });
    supabaseBrowser.from('founder_story').select('*').limit(1).single()
      .then(({ data }) => setFounder(data || null));
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
    <div className={`${styles.page} ${styles[`page_${theme}`]}`}>
      <nav className={styles.nav}>
        <button onClick={() => router.push('/')} className={styles.backBtn} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          <span className={styles.backText}>Back</span>
        </button>
        <span className={styles.navTitle}>Our Stories</span>
      </nav>

      <div className={styles.hero}>
        <h1 className={styles.title}>Stories from the Field</h1>
        <p className={styles.subtitle}>Real moments from schools, communities, and interviews — the faces behind our mission.</p>
      </div>

      {founder && (
        <div className={`${styles.founderBanner} ${styles[`founderBanner_${theme}`]}`}>
          <div className={styles.founderBannerInner}>
            <div className={styles.founderBannerLeft}>
              {founder.image_url && (
                <img src={getFileId(founder.image_url) ? `https://lh3.googleusercontent.com/d/${getFileId(founder.image_url)}` : founder.image_url} alt={founder.founder_name} className={styles.founderBannerAvatar} />
              )}
              <div>
                <span className={styles.founderBannerBadge}>✦ Founder&apos;s Story</span>
                <h2 className={styles.founderBannerTitle}>{founder.title}</h2>
                <p className={styles.founderBannerMeta}>{founder.founder_name}{founder.founder_date ? ` · ${founder.founder_date}` : ''}</p>
              </div>
            </div>
            <div className={styles.founderBannerBody}>
              <p className={styles.founderBannerText}>
                {founderExpanded ? founder.description : founder.description.slice(0, 320) + (founder.description.length > 320 ? '…' : '')}
              </p>
              {founder.description.length > 320 && (
                <button className={styles.founderBannerToggle} onClick={() => setFounderExpanded(v => !v)}>
                  {founderExpanded ? 'Show less ↑' : 'Read full story ↓'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {categories.length > 1 && (
        <div className={styles.filtersWrap}>
          <div className={styles.filters}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingWrap}><div className={styles.spinner} /><p className={styles.loadingText}>Loading stories…</p></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}><span className={styles.emptyIcon}>📷</span><p>No stories yet. Check back soon.</p></div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((story, i) => {
            const thumb = story.story_media[0];
            return (
              <article key={story.id} className={`${styles.card} ${styles[`card_${theme}`]} ${i === 0 ? styles.featured : ''}`}
                onClick={() => openStory(story)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && openStory(story)}>
                <div className={styles.mediaWrap}>
                  {!thumb ? (
                    <div className={styles.videoThumb}><div className={styles.playBtn}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
                  ) : thumb.type === 'video' ? (
                    <>
                      <div className={styles.videoThumb}><div className={styles.playBtn}><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>
                      <div className={styles.videoBadge}><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>Video</div>
                    </>
                  ) : (
                    <img src={getImageUrl(thumb.link)} alt={story.title} className={styles.media} loading="lazy" />
                  )}
                  <div className={styles.cardOverlay}>
                    {story.category && <span className={styles.tag}>{story.category}</span>}
                    {story.story_media.length > 1 && <span className={styles.mediaCount}>+{story.story_media.length - 1}</span>}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{story.title}</h3>
                  {story.location && (
                    <p className={styles.location}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {story.location}
                    </p>
                  )}
                  <p className={styles.excerpt}>{story.story_text.length > 100 ? story.story_text.slice(0, 100) + '…' : story.story_text}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.readMore}>Read story →</span>
                    <span className={styles.cardDate}>{new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
