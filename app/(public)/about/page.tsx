'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from '../public-page.module.css';

export default function AboutPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={`${styles.page} ${styles[`page_${theme}`]}`}>
      <nav className={styles.nav}>
        <button onClick={() => router.push('/')} className={styles.backBtn}>
          <span>←</span>
          <span className={styles.backText}>{t('back') || 'Back'}</span>
        </button>
      </nav>

      <div className={styles.hero}>
        <h1 className={styles.title}>About PAADhyvex</h1>
        <p className={styles.subtitle}>Pad Access and Advocacy for Dignity</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.text}>
            PAADhyvex is dedicated to breaking down barriers to menstrual health by providing free or subsidized sanitary pads, 
            education, and support to individuals who need them most. We believe that access to menstrual products is a basic human right, 
            not a luxury.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>What We Do</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>Provide free or subsidized sanitary pads to beneficiaries</li>
            <li className={styles.listItem}>Track menstrual cycles and provide health insights</li>
            <li className={styles.listItem}>Manage distribution networks with local distributors</li>
            <li className={styles.listItem}>Offer support and education on menstrual health</li>
            <li className={styles.listItem}>Create a safe community for sharing experiences</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Values</h2>
          <p className={styles.text}>
            <strong>Dignity:</strong> Every person deserves access to menstrual products without shame or stigma.
          </p>
          <p className={styles.text}>
            <strong>Accessibility:</strong> We work to make menstrual products available to all who need them.
          </p>
          <p className={styles.text}>
            <strong>Community:</strong> We build supportive networks that empower individuals.
          </p>
          <p className={styles.text}>
            <strong>Education:</strong> We provide information and resources for better menstrual health.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Get Involved</h2>
          <p className={styles.text}>
            Whether you need support or want to help others, PAADhyvex welcomes you. Sign up as a beneficiary to receive 
            pad allocations and track your cycle, or become a distributor to help deliver products to your community.
          </p>
        </div>
      </div>
    </div>
  );
}
