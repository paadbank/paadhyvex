'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import SideDrawer from '@/lib/SideDrawer';
import styles from './page.module.css';

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type Story = { id: string; title: string; location: string; story_text: string; category: string; story_media: StoryMedia[]; };

function getFileId(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function getThumb(url: string) {
  const id = getFileId(url);
  return id ? `https://lh3.googleusercontent.com/d/${id}` : url;
}
function getEmbed(url: string) {
  const id = getFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

// Featured video reel — shows the first published story that has a video media item
function VideoReel({ theme }: { theme: string }) {
  const [video, setVideo] = useState<{ story: Story; mediaLink: string } | null>(null);
  useEffect(() => {
    supabaseBrowser
      .from('story_media')
      .select('link, stories!inner(id,title,location,story_text,category,is_published,story_media(*))')
      .eq('type', 'video')
      .eq('stories.is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = data?.[0] as { link: string; stories: Story } | undefined;
        if (row) setVideo({ story: row.stories, mediaLink: row.link });
      });
  }, []);
  if (!video) return null;
  const { story, mediaLink } = video;
  return (
    <section className={styles.videoReel}>
      <div className={styles.videoReelInner}>
        <div className={styles.videoReelText}>
          <span className={styles.videoReelBadge}>📹 From the Field</span>
          <h2 className={styles.videoReelTitle}>{story.title}</h2>
          {story.location && <p className={styles.videoReelLocation}>📍 {story.location}</p>}
          <p className={styles.videoReelExcerpt}>
            {story.story_text.length > 160 ? story.story_text.slice(0, 160) + '…' : story.story_text}
          </p>
          <a href="/stories" className={styles.videoReelLink}>See all stories →</a>
        </div>
        <div className={styles.videoReelFrame}>
          <iframe
            src={getEmbed(mediaLink)}
            allow="autoplay; fullscreen"
            allowFullScreen
            title={story.title}
            className={styles.videoReelIframe}
          />
        </div>
      </div>
    </section>
  );
}

function StoriesPreview({ theme, router }: { theme: string; router: { push: (href: string) => void } }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [founderTitle, setFounderTitle] = useState('');
  useEffect(() => {
    supabaseBrowser
      .from('stories')
      .select('id,title,location,story_text,category,story_media(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setStories((data || []) as Story[]));
    supabaseBrowser
      .from('founder_story')
      .select('title')
      .limit(1)
      .single()
      .then(({ data }) => setFounderTitle(data?.title || 'Stories from the Field'));
  }, []);
  if (stories.length === 0) return null;
  return (
    <section className={styles.storiesPreview}>
      <div className={styles.storiesPreviewHeader}>
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>{founderTitle}</h2>
          <p className={styles.text} style={{ margin: 0 }}>Real moments from schools and communities we serve.</p>
        </div>
        <a href="/stories" className={styles.storiesViewAll}>View all →</a>
      </div>
      <div className={styles.storiesGrid}>
        {stories.map((s, i) => (
          <div
            key={s.id}
            className={`${styles.storyCard} ${styles[`storyCard_${theme}`]} ${i === 0 ? styles.storyCardFeatured : ''}`}
            onClick={() => router.push('/stories')}
          >
            <div className={styles.storyMedia}>
              {s.story_media[0]?.type === 'video' ? (
                <div className={styles.storyVideoThumb}>
                  <div className={styles.storyPlayBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              ) : s.story_media[0] ? (
                <img src={getThumb(s.story_media[0].link)} alt={s.title} className={styles.storyImg} loading="lazy" />
              ) : (
                <div className={styles.storyVideoThumb} />
              )}
              <div className={styles.storyOverlay}>
                {s.category && <span className={styles.storyTag}>{s.category}</span>}
              </div>
            </div>
            <div className={styles.storyBody}>
              <h3 className={styles.storyTitle}>{s.title}</h3>
              {s.location && <p className={styles.storyLocation}>📍 {s.location}</p>}
              <p className={styles.storyExcerpt}>{s.story_text.length > 80 ? s.story_text.slice(0, 80) + '…' : s.story_text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.storiesViewAllMobile}>
        <button onClick={() => router.push('/stories')} className={styles.secondaryBtn}>View All Stories</button>
      </div>
    </section>
  );
}

function FounderStoryPreview({ theme, router }: { theme: string; router: { push: (href: string) => void } }) {
  const [founder, setFounder] = useState<{ title: string; description: string; founder_name: string; founder_date: string; image_url: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    supabaseBrowser.from('founder_story').select('*').limit(1).single()
      .then(({ data }) => setFounder(data || null));
  }, []);
  if (!founder) return null;
  const imgId = getFileId(founder.image_url);
  const imgSrc = imgId ? `https://lh3.googleusercontent.com/d/${imgId}` : founder.image_url;
  const preview = founder.description.slice(0, 300);
  const hasMore = founder.description.length > 300;
  return (
    <section className={`${styles.founderPreview} ${styles[`founderPreview_${theme}`]}`}>
      <div className={styles.founderPreviewInner}>
        <div className={styles.founderPreviewLeft}>
          {founder.image_url && (
            <img src={imgSrc} alt={founder.founder_name} className={styles.founderPreviewAvatar} />
          )}
          <div>
            <span className={styles.founderPreviewBadge}>✦ Founder&apos;s Story</span>
            <h2 className={styles.founderPreviewTitle}>{founder.title}</h2>
            <p className={styles.founderPreviewMeta}>
              {founder.founder_name}{founder.founder_date ? ` · ${founder.founder_date}` : ''}
            </p>
          </div>
        </div>
        <div className={styles.founderPreviewBody}>
          <p className={styles.founderPreviewText}>
            {expanded ? founder.description : preview + (hasMore ? '…' : '')}
          </p>
          <div className={styles.founderPreviewActions}>
            {hasMore && (
              <button className={styles.founderPreviewToggle} onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Show less ↑' : 'Read full story ↓'}
              </button>
            )}
            <a href="/stories" className={styles.founderPreviewLink}>See all stories →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    beneficiaries: 0,
    padsDistributed: 0,
    satisfactionRate: 95
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [{ count: beneficiaryCount }, { data: distributions }] = await Promise.all([
        supabaseBrowser.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'beneficiary'),
        supabaseBrowser.from('distributions').select('num_pads')
      ]);
      
      const totalPads = distributions?.reduce((sum, d) => sum + (d.num_pads || 0), 0) || 0;
      
      setStats({
        beneficiaries: beneficiaryCount || 0,
        padsDistributed: totalPads,
        satisfactionRate: 95
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  return (
    <div className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🩸</span>
            <span className={styles.logoText}>PAADhyvex</span>
          </div>
          <div className={styles.navLinks}>
            <a href="/about">{t('about_text') || 'About'}</a>
            <a href="/stories">Stories</a>
            <a href="/privacy">{t('privacy_policy') || 'Privacy'}</a>
            <a href="/terms">{t('terms_of_service') || 'Terms'}</a>
          </div>
          <div className={styles.navActions}>
            <button onClick={toggleTheme} className={styles.iconBtn}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className={styles.iconBtn}>
              {lang === 'en' ? 'FR' : 'EN'}
            </button>
            <button onClick={() => router.push('/login')} className={styles.loginBtn}>
              {t('login') || 'Login'}
            </button>
            <button onClick={() => router.push('/signup')} className={styles.signupBtn}>
              {t('signup') || 'Sign Up'}
            </button>
            <button onClick={() => setIsMenuOpen(true)} className={styles.hamburger}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <SideDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        position="right"
        width={{ mobile: '85%', tablet: '400px', desktop: '400px' }}
        style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#2d2d2d' }}
      >
        <div className={`${styles.drawer} ${styles[`drawer_${theme}`]}`}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerLogo}>
              <span className={styles.logoIcon}>🩸</span>
              <span>PAADhyvex</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className={styles.closeBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className={styles.drawerContent}>
            <a href="/about" className={styles.drawerLink}>{t('about_text') || 'About'}</a>
            <a href="/stories" className={styles.drawerLink}>Stories</a>
            <a href="/privacy" className={styles.drawerLink}>{t('privacy_policy') || 'Privacy'}</a>
            <a href="/terms" className={styles.drawerLink}>{t('terms_of_service') || 'Terms'}</a>
            <div className={styles.drawerDivider}></div>
            <button onClick={() => router.push('/login')} className={styles.drawerLoginBtn}>
              {t('login') || 'Login'}
            </button>
            <button onClick={() => router.push('/signup')} className={styles.drawerSignupBtn}>
              {t('signup') || 'Sign Up'}
            </button>
          </div>
        </div>
      </SideDrawer>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>PAADhyvex</h1>
          <p className={styles.heroSubtitle}>Protection. Access. Awareness. Dignity. Hygiene. Value. Empowerment. eXpression.</p>
          <p className={styles.heroDescription}>
            One pad at a time — restoring dignity and changing lives across schools and communities in Sabogida Ora and beyond.
          </p>
          <div className={styles.heroCta}>
            <button onClick={() => router.push('/signup')} className={styles.primaryBtn}>
              Get Started
            </button>
            <button onClick={() => router.push('/about')} className={styles.secondaryBtn}>
              Our Story
            </button>
          </div>
        </section>

        <VideoReel theme={theme} />

        <FounderStoryPreview theme={theme} router={router} />

        <section className={styles.mission}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.text}>
            We believe access to menstrual products is a basic human right, not a luxury.
            PAADHYVEX exists to ensure that no girl misses school, no woman is left without support,
            and no person has to choose between dignity and survival.
          </p>
          <p className={styles.text} style={{ marginTop: '1rem' }}>
            Through free pad distribution, cycle tracking, community outreach, and a growing network
            of distributors, we are building a future where menstrual health is accessible to all —
            regardless of income, location, or circumstance.
          </p>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>What We Do</h2>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🩺</div>
              <h3>Free Pad Distribution</h3>
              <p>We reach schools, communities, and individuals who cannot afford sanitary pads — delivering dignity directly to those who need it most.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📅</div>
              <h3>Cycle Tracking</h3>
              <p>Beneficiaries can log and track their menstrual cycles, receive predictions, and monitor their health with a simple, private calendar.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🚚</div>
              <h3>Distribution Network</h3>
              <p>A managed network of distributors ensures pads reach the right people — through pickup or direct delivery to homes and schools.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💬</div>
              <h3>Support & Community</h3>
              <p>A safe space to connect with distributors and admins, ask questions, and share experiences without shame or stigma.</p>
            </div>
          </div>
        </section>

        <section className={styles.roles}>
          <h2 className={styles.sectionTitle}>Who We Serve</h2>
          <div className={styles.roleGrid}>
            <div className={styles.roleCard}>
              <h3>🎓 Students & Girls</h3>
              <p>Female students who miss school or struggle in silence because of their period. Every girl deserves to learn without shame.</p>
            </div>
            <div className={styles.roleCard}>
              <h3>👩 Women in the Community</h3>
              <p>Women in developing communities like Sabogida Ora where access to basic menstrual products is still a daily challenge.</p>
            </div>
            <div className={styles.roleCard}>
              <h3>🤝 Partners & Sponsors</h3>
              <p>NGOs, individuals, and organisations who believe dignity is not a privilege. Your support funds outreaches and changes lives.</p>
            </div>
          </div>
        </section>

        <section className={styles.impact}>
          <h2 className={styles.sectionTitle}>Our Impact So Far</h2>
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>116+</div>
              <div className={styles.impactLabel}>Pads Distributed in March</div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>4+</div>
              <div className={styles.impactLabel}>Schools & Communities Reached</div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>{stats.padsDistributed > 116 ? (stats.padsDistributed >= 1000 ? `${(stats.padsDistributed / 1000).toFixed(1)}K+` : `${stats.padsDistributed}+`) : '116+'}</div>
              <div className={styles.impactLabel}>Total Pads Distributed</div>
            </div>
          </div>
        </section>

        <StoriesPreview theme={theme} router={router} />

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Be Part of the Change</h2>
          <p className={styles.ctaText}>
            If this much impact can be made with limited resources, imagine what is possible with your support.
            Partner with us. Sponsor a girl. Fund an outreach. Together, we can rewrite more stories — one pad at a time.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/signup')} className={styles.ctaButton}>
              Join PAADHYVEX
            </button>
            <a href="/stories" className={styles.secondaryBtn} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              Read Our Stories
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>PAADhyvex</h4>
            <p>Protection. Access. Awareness. Dignity.</p>
            <p>Hygiene. Value. Empowerment. eXpression.</p>
            <p style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.7 }}>One pad at a time.</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Quick Links</h4>
            <a href="/about">{t('about_text') || 'About'}</a>
            <a href="/stories">Stories</a>
            <a href="/privacy">{t('privacy_policy') || 'Privacy Policy'}</a>
            <a href="/terms">{t('terms_of_service') || 'Terms of Service'}</a>
          </div>
          <div className={styles.footerSection}>
            <h4>Get Involved</h4>
            <p>Partner with us. Sponsor a girl.</p>
            <p>Fund an outreach. Amplify this mission.</p>
            <p style={{ marginTop: '0.5rem' }}>📧 support@paadhyvex.org</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 PAADhyvex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
