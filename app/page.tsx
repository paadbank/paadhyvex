'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import SideDrawer from '@/lib/SideDrawer';
import styles from './page.module.css';

type Story = { id: string; title: string; location: string; story_text: string; media_url: string; media_type: 'image' | 'video'; category: string; };

function getFileId(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function getThumb(url: string) {
  const id = getFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : url;
}
function getEmbed(url: string) {
  const id = getFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

// Featured video reel — shows the first published video after the mission section
function VideoReel({ theme }: { theme: string }) {
  const [video, setVideo] = useState<Story | null>(null);
  useEffect(() => {
    supabaseBrowser
      .from('stories')
      .select('id,title,location,story_text,media_url,media_type,category')
      .eq('is_published', true)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setVideo(data?.[0] || null));
  }, []);
  if (!video) return null;
  return (
    <section className={styles.videoReel}>
      <div className={styles.videoReelInner}>
        <div className={styles.videoReelText}>
          <span className={styles.videoReelBadge}>📹 From the Field</span>
          <h2 className={styles.videoReelTitle}>{video.title}</h2>
          {video.location && <p className={styles.videoReelLocation}>📍 {video.location}</p>}
          <p className={styles.videoReelExcerpt}>
            {video.story_text.length > 160 ? video.story_text.slice(0, 160) + '…' : video.story_text}
          </p>
          <a href="/stories" className={styles.videoReelLink}>See all stories →</a>
        </div>
        <div className={styles.videoReelFrame}>
          <iframe
            src={getEmbed(video.media_url)}
            allow="autoplay; fullscreen"
            allowFullScreen
            title={video.title}
            className={styles.videoReelIframe}
          />
        </div>
      </div>
    </section>
  );
}

function StoriesPreview({ theme, router }: { theme: string; router: { push: (href: string) => void } }) {
  const [stories, setStories] = useState<Story[]>([]);
  useEffect(() => {
    supabaseBrowser
      .from('stories')
      .select('id,title,location,story_text,media_url,media_type,category')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setStories(data || []));
  }, []);
  if (stories.length === 0) return null;
  return (
    <section className={styles.storiesPreview}>
      <div className={styles.storiesPreviewHeader}>
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Stories from the Field</h2>
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
              {s.media_type === 'video' ? (
                <div className={styles.storyVideoThumb}>
                  <div className={styles.storyPlayBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              ) : (
                <img src={getThumb(s.media_url)} alt={s.title} className={styles.storyImg} loading="lazy" />
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
          <p className={styles.heroSubtitle}>Pad Access and Advocacy for Dignity Bank</p>
          <p className={styles.heroDescription}>
            Empowering menstrual health through accessible pad distribution, cycle tracking, and comprehensive support services.
          </p>
          <div className={styles.heroCta}>
            <button onClick={() => router.push('/signup')} className={styles.primaryBtn}>
              Get Started
            </button>
            <button onClick={() => router.push('/about')} className={styles.secondaryBtn}>
              Learn More
            </button>
          </div>
        </section>

        <VideoReel theme={theme} />

        <section className={styles.mission}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.text}>
            PAADhyvex is dedicated to breaking down barriers to menstrual health by providing free or subsidized sanitary pads, 
            education, and support to individuals who need them most. We believe that access to menstrual products is a basic human right, 
            not a luxury.
          </p>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>What We Offer</h2>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📅</div>
              <h3>Cycle Tracking</h3>
              <p>Track your menstrual cycle with our intuitive calendar system. Log period details, flow intensity, and receive predictions for your next cycle.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📦</div>
              <h3>Pad Distribution</h3>
              <p>Access free or subsidized sanitary pads through our distribution network. Choose pickup or delivery options based on your needs.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💬</div>
              <h3>Support & Messaging</h3>
              <p>Connect with distributors, admins, and other beneficiaries. Get support, ask questions, and share experiences in a safe environment.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📊</div>
              <h3>Health Insights</h3>
              <p>View your cycle statistics, average duration, and patterns. Make informed decisions about your menstrual health.</p>
            </div>
          </div>
        </section>

        <section className={styles.roles}>
          <h2 className={styles.sectionTitle}>Who We Serve</h2>
          <div className={styles.roleGrid}>
            <div className={styles.roleCard}>
              <h3>👥 Beneficiaries</h3>
              <p>Individuals receiving pad allocations, tracking their cycles, and accessing support services.</p>
            </div>
            <div className={styles.roleCard}>
              <h3>🚚 Distributors</h3>
              <p>Community members managing pad distribution, deliveries, and supporting beneficiaries.</p>
            </div>
            <div className={styles.roleCard}>
              <h3>👨‍💼 Administrators</h3>
              <p>Program managers overseeing operations, expenses, and ensuring smooth service delivery.</p>
            </div>
          </div>
        </section>

        <section className={styles.impact}>
          <h2 className={styles.sectionTitle}>Our Impact</h2>
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>{stats.beneficiaries.toLocaleString()}+</div>
              <div className={styles.impactLabel}>Beneficiaries Served</div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>{stats.padsDistributed >= 1000 ? `${(stats.padsDistributed / 1000).toFixed(1)}K+` : `${stats.padsDistributed}+`}</div>
              <div className={styles.impactLabel}>Pads Distributed</div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactNumber}>{stats.satisfactionRate}%</div>
              <div className={styles.impactLabel}>Satisfaction Rate</div>
            </div>
          </div>
        </section>

        <StoriesPreview theme={theme} router={router} />

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Join PAADhyvex Today</h2>
          <p className={styles.ctaText}>
            Whether you need support or want to help others, PAADhyvex welcomes you. 
            Sign up now to access our services or become a distributor in your community.
          </p>
          <button onClick={() => router.push('/signup')} className={styles.ctaButton}>
            Create Your Account
          </button>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>PAADhyvex</h4>
            <p>Pad Access and Advocacy for Dignity</p>
            <p>Breaking barriers to menstrual health</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Quick Links</h4>
            <a href="/about">{t('about_text') || 'About'}</a>
            <a href="/privacy">{t('privacy_policy') || 'Privacy Policy'}</a>
            <a href="/terms">{t('terms_of_service') || 'Terms of Service'}</a>
          </div>
          <div className={styles.footerSection}>
            <h4>Contact</h4>
            <p>Email: support@paadhyvex.org</p>
            <p>Available 24/7 for support</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2025 PAADhyvex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
