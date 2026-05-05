'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNav } from '@/lib/NavigationStack';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import EmptyRecord from '@/components/EmptyRecord/EmptyRecord';
import styles from './page.module.css';

async function getMediaUrl(mediaId: string): Promise<string> {
  try {
    // First check if URL exists in database
    const { data } = await supabaseBrowser
      .from('story_media')
      .select('processed_url')
      .eq('id', mediaId)
      .single();
    
    if (data?.processed_url) {
      // Verify the URL actually works by attempting to fetch it
      try {
        const testResponse = await fetch(data.processed_url, { method: 'HEAD' });
        if (testResponse.ok) {
          return data.processed_url;
        }
        // If file doesn't exist, fall through to API call
        console.warn(`File not found in storage for media ${mediaId}, reprocessing...`);
      } catch {
        // Network error or file doesn't exist, fall through to API call
      }
    }
    
    // If no processed_url or file doesn't exist, call API to process
    const res = await fetch(`/api/get-media?id=${mediaId}`);
    const result = await res.json();
    return result.url || '';
  } catch {
    return '';
  }
}

function StoryThumb({ mediaId, title }: { mediaId: string; title: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    
    const loadMedia = async () => {
      try {
        const { data } = await supabaseBrowser
          .from('story_media')
          .select('processed_url')
          .eq('id', mediaId)
          .single();
        
        if (!cancelled && data?.processed_url) {
          setUrl(data.processed_url);
          setLoading(false);
          return;
        }
        
        const res = await fetch(`/api/get-media?id=${mediaId}`);
        const result = await res.json();
        if (!cancelled) {
          if (result.url) {
            setUrl(result.url);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadMedia();
    return () => { cancelled = true; };
  }, [mediaId]);
  
  if (loading) return <div className={styles.thumbVideo}><div className={styles.spinner} /></div>;
  if (error) return <div className={styles.thumbVideo}><span>⚠️</span></div>;
  return <img src={url} alt={title} className={styles.thumbImg} />;
}

function VideoThumb({ mediaId, title }: { mediaId: string; title: string }) {
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    
    const loadMedia = async () => {
      try {
        const { data } = await supabaseBrowser
          .from('story_media')
          .select('processed_url')
          .eq('id', mediaId)
          .single();
        
        if (!cancelled && data?.processed_url) {
          setUrl(data.processed_url);
          return;
        }
        
        const res = await fetch(`/api/get-media?id=${mediaId}`);
        const result = await res.json();
        if (!cancelled) {
          if (result.url) {
            setUrl(result.url);
          } else {
            setError(true);
            setLoading(false);
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadMedia();
    return () => { cancelled = true; };
  }, [mediaId]);
  
  // Generate thumbnail from video
  useEffect(() => {
    if (!url || error) return;
    
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    
    const captureFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbData = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnail(thumbData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to capture video frame:', err);
        setError(true);
        setLoading(false);
      }
      video.remove();
    };
    
    video.addEventListener('loadeddata', captureFrame);
    video.addEventListener('error', () => {
      setError(true);
      setLoading(false);
      video.remove();
    });
    video.currentTime = 0.1;
    
    return () => {
      video.removeEventListener('loadeddata', captureFrame);
      video.remove();
    };
  }, [url, error]);
  
  if (loading) {
    return <div className={styles.thumbVideo}><div className={styles.spinner} /></div>;
  }
  
  if (error || !thumbnail) {
    return (
      <div className={styles.thumbVideo}>
        <div className={styles.thumbPlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src={thumbnail} alt={title} className={styles.thumbImg} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className={styles.thumbPlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
}

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type StoryMember = { id: string; fullname: string };
type Story = {
  id: string; title: string; location: string; story_text: string;
  category: string; created_at: string;
  story_media: StoryMedia[]; story_members: StoryMember[];
};

function MediaCarousel({ media, title }: { media: StoryMedia[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [errorUrls, setErrorUrls] = useState<Record<string, boolean>>({});
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    setIdx(0);
  }, [media.map(m => m.id).join(',')]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMedia = async () => {
      for (const m of media) {
        if (!mediaUrls[m.id] && !loadingUrls[m.id] && !cancelled) {
          setLoadingUrls(prev => ({ ...prev, [m.id]: true }));
          
          try {
            const { data } = await supabaseBrowser
              .from('story_media')
              .select('processed_url')
              .eq('id', m.id)
              .single();
            
            if (!cancelled && data?.processed_url) {
              setMediaUrls(prev => ({ ...prev, [m.id]: data.processed_url }));
              setLoadingUrls(prev => ({ ...prev, [m.id]: false }));
              continue;
            }
            
            const url = await getMediaUrl(m.id);
            if (url && !cancelled) {
              setMediaUrls(prev => ({ ...prev, [m.id]: url }));
            } else if (!cancelled) {
              setErrorUrls(prev => ({ ...prev, [m.id]: true }));
            }
          } catch {
            if (!cancelled) {
              setErrorUrls(prev => ({ ...prev, [m.id]: true }));
            }
          } finally {
            if (!cancelled) {
              setLoadingUrls(prev => ({ ...prev, [m.id]: false }));
            }
          }
        }
      }
    };
    loadMedia();
    return () => { cancelled = true; };
  }, [media.map(m => m.id).join(',')]);

  // Generate video thumbnails
  useEffect(() => {
    const generateThumbnails = async () => {
      for (const m of media) {
        if (m.type === 'video' && mediaUrls[m.id] && !videoThumbnails[m.id]) {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          video.src = mediaUrls[m.id];
          
          const captureFrame = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 360;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                setVideoThumbnails(prev => ({ ...prev, [m.id]: canvas.toDataURL('image/jpeg', 0.8) }));
              }
            } catch (err) {
              console.error('Failed to capture video frame:', err);
            }
            video.remove();
          };
          
          video.addEventListener('loadeddata', captureFrame);
          video.currentTime = 0.1;
        }
      }
    };
    
    generateThumbnails();
  }, [media.map(m => m.id).join(','), Object.keys(mediaUrls).join(',')]);

  useEffect(() => {
    if (videoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [videoModalOpen]);

  if (media.length === 0) return <div className={styles.detailMediaEmpty}><span>📷</span></div>;
  
  const cur = media[idx] || media[0];
  const curUrl = mediaUrls[cur?.id];
  const isLoading = loadingUrls[cur?.id];
  const hasError = errorUrls[cur?.id];
  const curThumbnail = videoThumbnails[cur?.id];
  
  return (
    <>
      <div className={styles.detailCarousel}>
        <div className={styles.detailCarouselFrame}>
          {isLoading ? (
            <div className={styles.detailMediaEmpty}><LoadingSpinner /></div>
          ) : hasError ? (
            <div className={styles.detailMediaEmpty}><span>⚠️ Failed to load media</span></div>
          ) : !curUrl ? (
            <div className={styles.detailMediaEmpty}><LoadingSpinner /></div>
          ) : cur.type === 'video' ? (
            isMobile ? (
              <div className={styles.videoPoster} onClick={() => setVideoModalOpen(true)}>
                {curThumbnail ? (
                  <img src={curThumbnail} alt={title} className={styles.videoThumbnail} />
                ) : (
                  <div className={styles.detailMediaEmpty}><LoadingSpinner /></div>
                )}
                <div className={styles.videoPosterOverlay}>
                  <div className={styles.videoPosterPlayBtn}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <p className={styles.videoPosterText}>Tap to play video</p>
                </div>
              </div>
            ) : (
              <video src={curUrl} controls className={styles.detailIframe} />
            )
          ) : (
            <img src={curUrl} alt={title} className={styles.detailImg} />
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

      {videoModalOpen && isMobile && cur.type === 'video' && curUrl && (
        <div className={styles.videoModal} onClick={() => setVideoModalOpen(false)}>
          <div className={styles.videoModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.videoModalClose} onClick={() => setVideoModalOpen(false)} aria-label="Close video">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className={styles.videoModalFrame}>
              <video src={curUrl} controls autoPlay className={styles.videoModalIframe} />
            </div>
          </div>
        </div>
      )}
    </>
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

  const filtered = filter === 'all' ? stories : stories.filter(s => s.category?.trim().toLowerCase() === filter.toLowerCase());
  
  const categoryMap = new Map<string, string>();
  stories.forEach(s => {
    const cat = s.category?.trim();
    if (cat) {
      const key = cat.toLowerCase();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, cat);
      }
    }
  });
  const uniqueCategories = Array.from(categoryMap.values());
  const categories = ['all', ...uniqueCategories];

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
                        <VideoThumb mediaId={thumb.id} title={story.title} />
                      ) : (
                        <StoryThumb mediaId={thumb.id} title={story.title} />
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
