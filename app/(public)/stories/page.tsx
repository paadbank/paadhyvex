'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './stories.module.css';

async function getMediaUrl(mediaId: string): Promise<string> {
  try {
    const res = await fetch(`/api/get-media?id=${mediaId}`);
    const data = await res.json();
    return data.url;
  } catch {
    return '';
  }
}

function FounderImage({ founderId, imageUrl, name }: { founderId: string; imageUrl: string; name: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    
    // Check if already processed
    const checkProcessed = async () => {
      try {
        const { data } = await supabaseBrowser
          .from('founder_story')
          .select('processed_image_url')
          .eq('id', founderId)
          .single();
        
        if (!cancelled && data?.processed_image_url) {
          setUrl(data.processed_image_url);
          setLoading(false);
          return;
        }
        
        // If not processed, fetch from API
        const res = await fetch(`/api/get-founder-image?id=${founderId}`);
        const result = await res.json();
        if (!cancelled) {
          setUrl(result.url);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUrl(imageUrl);
          setLoading(false);
        }
      }
    };
    
    checkProcessed();
    return () => { cancelled = true; };
  }, [founderId, imageUrl]);
  
  if (loading) return <div className={styles.spinner} />;
  return <img src={url} alt={name} className={styles.founderBannerAvatar} />;
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
    return <div className={styles.videoThumb}><div className={styles.spinner} /></div>;
  }
  
  if (error || !thumbnail) {
    return (
      <div className={styles.videoThumb}>
        <div className={styles.playBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.videoThumbWrap}>
      <img src={thumbnail} alt={title} className={styles.media} />
      <div className={styles.videoThumbOverlay}>
        <div className={styles.playBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
  );
}

function StoryThumb({ mediaId, title }: { mediaId: string; title: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    
    const loadMedia = async () => {
      try {
        // Check database first
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
        
        // If not processed, fetch from API
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
  
  if (loading) return <div className={styles.videoThumb}><div className={styles.spinner} /></div>;
  if (error) return <div className={styles.videoThumb}><span>⚠️</span></div>;
  return <img src={url} alt={title} className={styles.media} loading="lazy" />;
}

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type StoryMember = { id: string; fullname: string };
type Story = {
  id: string; title: string; location: string; story_text: string;
  category: string; created_at: string;
  story_media: StoryMedia[]; story_members: StoryMember[];
};
type FounderStory = { id: string; title: string; description: string; founder_name: string; founder_date: string; image_url: string; };


function MediaCarousel({ media, title }: { media: StoryMedia[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});
  const [errorUrls, setErrorUrls] = useState<Record<string, boolean>>({});
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});

  // Reset carousel index when story changes
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

  if (media.length === 0) return (
    <div className={styles.detailMediaEmpty}>
      <span>📷</span>
    </div>
  );
  
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
            <div className={styles.detailMediaEmpty}><div className={styles.spinner} /></div>
          ) : hasError ? (
            <div className={styles.detailMediaEmpty}><span>⚠️ Failed to load media</span></div>
          ) : !curUrl ? (
            <div className={styles.detailMediaEmpty}><div className={styles.spinner} /></div>
          ) : cur.type === 'video' ? (
            isMobile ? (
              <div className={styles.videoPoster} onClick={() => setVideoModalOpen(true)}>
                {curThumbnail ? (
                  <img src={curThumbnail} alt={title} className={styles.videoThumbnail} />
                ) : (
                  <div className={styles.detailMediaEmpty}><div className={styles.spinner} /></div>
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

  const filtered = filter === 'all' ? stories : stories.filter(s => s.category?.trim().toLowerCase() === filter.toLowerCase());
  
  // Get unique categories (case-insensitive, trimmed)
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
                <FounderImage founderId={founder.id} imageUrl={founder.image_url} name={founder.founder_name} />
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
                      <VideoThumb mediaId={thumb.id} title={story.title} />
                      <div className={styles.videoBadge}><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>Video</div>
                    </>
                  ) : (
                    <StoryThumb mediaId={thumb.id} title={story.title} />
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
