'use client';

import { useState, useEffect } from 'react';
import { useNav } from '@/lib/NavigationStack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner';
import styles from './page.module.css';

type StoryMedia = { id: string; link: string; type: 'image' | 'video' };
type Story = { id: string; title: string; location: string; story_text: string; category: string; story_media: StoryMedia[]; };

function getThumb(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

function getFileId(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const nav = useNav();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [founderTitle, setFounderTitle] = useState('Featured Stories');

  useEffect(() => {
    loadDashboard();
  }, []);

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
      .then(({ data }) => { if (data?.title) setFounderTitle(data.title); });
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profileData } = await supabaseBrowser
        .from('profiles').select('*').eq('id', user.id).single();

      setProfile(profileData);

      if (profileData?.role === 'beneficiary') {
        const [{ data: cycles }, { data: distributions }, { data: notifications }] = await Promise.all([
          supabaseBrowser.from('cycle_logs').select('*').eq('beneficiary_id', user.id),
          supabaseBrowser.from('distributions').select('*').eq('beneficiary_id', user.id),
          supabaseBrowser.from('notifications').select('*').eq('recipient_id', user.id).eq('is_read', false)
        ]);
        setStats({ totalCycles: cycles?.length || 0, totalDistributions: distributions?.length || 0, unreadNotifications: notifications?.length || 0, nextPeriod: profileData.next_period_date });
      } else if (profileData?.role === 'distributor') {
        const [{ data: distributions }, { data: beneficiaries }] = await Promise.all([
          supabaseBrowser.from('distributions').select('*').eq('distributor_id', user.id),
          supabaseBrowser.from('profiles').select('*').eq('assigned_distributor_id', user.id)
        ]);
        setStats({ totalDistributions: distributions?.length || 0, pendingDistributions: distributions?.filter(d => d.status === 'pending').length || 0, assignedBeneficiaries: beneficiaries?.length || 0 });
      } else if (profileData?.role === 'sales') {
        const { data: expenses } = await supabaseBrowser.from('expense_records').select('*');
        const totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount_spent), 0) || 0;
        const totalGiven = expenses?.reduce((sum, e) => sum + Number(e.amount_given), 0) || 0;
        setStats({ totalExpenses: expenses?.length || 0, totalSpent, totalGiven, balance: totalGiven - totalSpent });
      } else if (profileData?.role === 'logger') {
        const [{ data: cycles }, { count: beneficiaryCount }] = await Promise.all([
          supabaseBrowser.from('cycle_logs').select('*'),
          supabaseBrowser.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'beneficiary')
        ]);
        const recentCycles = cycles?.filter(c => { const d = new Date(c.created_at); const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }).length || 0;
        setStats({ totalCycles: cycles?.length || 0, recentCycles, beneficiaryCount: beneficiaryCount || 0, openCycles: cycles?.filter(c => c.status === 'open').length || 0 });
      } else if (profileData?.role === 'manager' || profileData?.role === 'admin') {
        const [{ count: beneficiaryCount }, { count: distributorCount }, { data: distributions }, { data: expenses }] = await Promise.all([
          supabaseBrowser.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'beneficiary'),
          supabaseBrowser.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'distributor'),
          supabaseBrowser.from('distributions').select('*'),
          supabaseBrowser.from('expense_records').select('*')
        ]);
        setStats({ beneficiaryCount: beneficiaryCount || 0, distributorCount: distributorCount || 0, totalDistributions: distributions?.length || 0, totalExpenses: expenses?.reduce((sum, e) => sum + Number(e.amount_spent), 0) || 0 });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome, {profile?.full_name}!</h1>
          <p className={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className={styles.grid}>
          {profile?.role === 'beneficiary' && (<>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📅</div><h3>Total Cycles</h3><p className={styles.value}>{stats.totalCycles}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📦</div><h3>Distributions</h3><p className={styles.value}>{stats.totalDistributions}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>🔔</div><h3>Notifications</h3><p className={styles.value}>{stats.unreadNotifications}</p></div>
            {stats.nextPeriod && <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📆</div><h3>Next Period</h3><p className={styles.value}>{new Date(stats.nextPeriod).toLocaleDateString()}</p></div>}
          </>)}

          {profile?.role === 'distributor' && (<>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>👥</div><h3>Assigned Beneficiaries</h3><p className={styles.value}>{stats.assignedBeneficiaries}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📦</div><h3>Total Distributions</h3><p className={styles.value}>{stats.totalDistributions}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>⏳</div><h3>Pending</h3><p className={styles.value}>{stats.pendingDistributions}</p></div>
          </>)}

          {profile?.role === 'sales' && (<>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>💰</div><h3>Total Given</h3><p className={styles.value}>${stats.totalGiven?.toFixed(2)}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>💸</div><h3>Total Spent</h3><p className={styles.value}>${stats.totalSpent?.toFixed(2)}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>💵</div><h3>Balance</h3><p className={styles.value}>${stats.balance?.toFixed(2)}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📊</div><h3>Total Expenses</h3><p className={styles.value}>{stats.totalExpenses}</p></div>
          </>)}

          {profile?.role === 'logger' && (<>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📝</div><h3>Total Cycles Logged</h3><p className={styles.value}>{stats.totalCycles}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>🆕</div><h3>Recent (7 days)</h3><p className={styles.value}>{stats.recentCycles}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>👥</div><h3>Beneficiaries</h3><p className={styles.value}>{stats.beneficiaryCount}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>🔓</div><h3>Open Cycles</h3><p className={styles.value}>{stats.openCycles}</p></div>
          </>)}

          {(profile?.role === 'manager' || profile?.role === 'admin') && (<>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>👥</div><h3>Beneficiaries</h3><p className={styles.value}>{stats.beneficiaryCount}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>🚚</div><h3>Distributors</h3><p className={styles.value}>{stats.distributorCount}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>📦</div><h3>Distributions</h3><p className={styles.value}>{stats.totalDistributions}</p></div>
            <div className={`${styles.card} ${styles[`card_${theme}`]}`}><div className={styles.cardIcon}>💰</div><h3>Total Expenses</h3><p className={styles.value}>${stats.totalExpenses?.toFixed(2)}</p></div>
          </>)}
        </div>

        {stories.length > 0 && (
          <section className={styles.storiesSection}>
            <div className={styles.storiesHeader}>
              <h2 className={styles.storiesTitle}>📸 {founderTitle}</h2>
              <button onClick={() => nav.push('stories_view_page')} className={styles.viewAllBtn}>View all →</button>
            </div>
            <div className={styles.storiesStrip}>
              {stories.map(s => (
                <div
                  key={s.id}
                  className={`${styles.storyCard} ${styles[`storyCard_${theme}`]}`}
                  onClick={() => nav.push('stories_view_page')}
                >
                  <div className={styles.storyMedia}>
                    {s.story_media[0]?.type === 'video' ? (
                      <img 
                        src={`https://drive.google.com/thumbnail?id=${getFileId(s.story_media[0].link)}&sz=w1000`}
                        alt={s.title}
                        className={styles.storyImg}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = styles.storyVideoThumb;
                            fallback.innerHTML = '<div class="' + styles.storyPlayIcon + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>';
                            parent.insertBefore(fallback, target);
                          }
                        }}
                      />
                    ) : s.story_media[0] ? (
                      <img src={getThumb(s.story_media[0].link)} alt={s.title} className={styles.storyImg} />
                    ) : (
                      <div className={styles.storyVideoThumb} />
                    )}
                  </div>
                  <div className={styles.storyBody}>
                    {s.category && <span className={styles.storyTag}>{s.category}</span>}
                    <p className={styles.storyName}>{s.title}</p>
                    {s.location && <p className={styles.storyLoc}>📍 {s.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
