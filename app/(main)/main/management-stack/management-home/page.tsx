'use client';

import { useNav } from '@/lib/NavigationStack';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function ManagementHome() {
  const nav = useNav();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setUserRole(profile?.role || '');
  };

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isLogger = userRole === 'logger';
  const isSales = userRole === 'sales';

  return (
    <div className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('management') || 'Management'}</h1>
        <p className={styles.subtitle}>Access all management features</p>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('distribution_page')}>
            <span className={styles.icon}>📦</span>
            <h3>{t('distributions') || 'Distributions'}</h3>
            <p>Manage pad distributions and deliveries</p>
          </div>

          {isAdmin && (
            <>
              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('stories_page')}>
                <span className={styles.icon}>📸</span>
                <h3>Stories</h3>
                <p>Manage field photos, videos and stories</p>
              </div>

              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('expenses_page')}>
                <span className={styles.icon}>💰</span>
                <h3>{t('expenses') || 'Expenses'}</h3>
                <p>Track expenses and budgets</p>
              </div>

              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('reports_page')}>
                <span className={styles.icon}>📊</span>
                <h3>{t('reports') || 'Reports'}</h3>
                <p>View analytics and reports</p>
              </div>

              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('admin_page')}>
                <span className={styles.icon}>🛡️</span>
                <h3>{t('admin') || 'Admin'}</h3>
                <p>User management and settings</p>
              </div>
            </>
          )}

          <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('messaging_page')}>
            <span className={styles.icon}>💬</span>
            <h3>{t('messages') || 'Messages'}</h3>
            <p>Communication and messaging</p>
          </div>

          {isLogger && (
            <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('log_cycle_page')}>
              <span className={styles.icon}>📝</span>
              <h3>Log Cycles</h3>
              <p>Log cycles for beneficiaries</p>
            </div>
          )}

          {isSales && (
            <>
              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('transactions_page')}>
                <span className={styles.icon}>🛒</span>
                <h3>Transactions</h3>
                <p>Log purchases and sales</p>
              </div>

              <div className={`${styles.card} ${styles[`card_${theme}`]}`} onClick={() => nav.push('ledger_page')}>
                <span className={styles.icon}>📚</span>
                <h3>Ledger</h3>
                <p>View comprehensive ledger</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
