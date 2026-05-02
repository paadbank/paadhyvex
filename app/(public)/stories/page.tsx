'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './stories.module.css';

type Story = {
  id: string;
  title: string;
  location: string;
  story_text: string;
  media_url: string;
  media_type: 'image' | 'video';
  category: string;
  created_at: string;
};

function getFileId(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function getImageUrl(url: string) {
  const id = getFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url;
}

function getEmbedUrl(url: string) {
  const id = getFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

export default function StoriesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Story | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    supabaseBrowser
      .from('stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setStories(data || []); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? stories : stories.filter(s => s.category === filter);
  const categories = ['all', ...Array.from(new Set(stories.map(s => s.category).filter(Boolean)))];

  const openStory = (story: Story) => {
    setSelected(story);
    setSelectedIndex(filtered.findIndex(s => s.id === story.id));
  };

  const navigate = useCallback((dir: 1 | -1) => {
    const next = selectedIndex + dir;
    if (next >= 0 && next < filtered.length) {
      setSelected(filtered[next]);
      setSelectedIndex(next);
    }
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

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

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
        <p className={styles.subtitle}>
          Real moments from schools, communities, and interviews — the faces behind our mission.
        </p>
      </div>

      {categories.length > 1 && (
        <div className={styles.filtersWrap}>
          <div className={styles.filters}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading stories…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📷</span>
          <p>No stories yet. Check back soon.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((story, i) => (
            <article
              key={story.id}
              className={`${styles.card} ${styles[`card_${theme}`]} ${i === 0 ? styles.featured : ''}`}
              onClick={() => openStory(story)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && openStory(story)}
            >
              <div className={styles.mediaWrap}>
                {story.media_type === 'video' ? (
                  <>
                    <div className={styles.videoThumb}>
                      <div className={styles.playBtn}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div className={styles.videoBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                        <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                      </svg>
                      Video
                    </div>
                  </>
                ) : (
                  <img
                    src={getImageUrl(story.media_url)}
                    alt={story.title}
                    className={styles.media}
                    loading="lazy"
                  />
                )}
                <div className={styles.cardOverlay}>
                  {story.category && <span className={styles.tag}>{story.category}</span>}
                </div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{story.title}</h3>
                {story.location && (
                  <p className={styles.location}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {story.location}
                  </p>
                )}
                <p className={styles.excerpt}>
                  {story.story_text.length > 100 ? story.story_text.slice(0, 100) + '…' : story.story_text}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.readMore}>Read story →</span>
                  <span className={styles.cardDate}>
                    {new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Full-screen modal */}
      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div
            className={`${styles.modal} ${styles[`modal_${theme}`]}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button className={styles.closeBtn} onClick={() => setSelected(null)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Prev / Next */}
            {selectedIndex > 0 && (
              <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={() => navigate(-1)} aria-label="Previous">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            )}
            {selectedIndex < filtered.length - 1 && (
              <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={() => navigate(1)} aria-label="Next">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            )}

            <div className={styles.modalInner}>
              <div className={styles.modalMedia}>
                {selected.media_type === 'video' ? (
                  <iframe
                    src={getEmbedUrl(selected.media_url)}
                    className={styles.modalIframe}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title={selected.title}
                  />
                ) : (
                  <img
                    src={getImageUrl(selected.media_url)}
                    alt={selected.title}
                    className={styles.modalImg}
                  />
                )}
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalMeta}>
                  {selected.category && <span className={styles.tag}>{selected.category}</span>}
                  <span className={styles.modalDate}>
                    {new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 className={styles.modalTitle}>{selected.title}</h2>
                {selected.location && (
                  <p className={styles.location}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {selected.location}
                  </p>
                )}
                <p className={styles.modalText}>{selected.story_text}</p>

                <div className={styles.modalNav}>
                  <button
                    className={styles.modalNavBtn}
                    onClick={() => navigate(-1)}
                    disabled={selectedIndex === 0}
                  >
                    ← Previous
                  </button>
                  <span className={styles.modalCounter}>{selectedIndex + 1} / {filtered.length}</span>
                  <button
                    className={styles.modalNavBtn}
                    onClick={() => navigate(1)}
                    disabled={selectedIndex === filtered.length - 1}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
