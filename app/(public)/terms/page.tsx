'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from '../public-page.module.css';

export default function TermsPage() {
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
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>Guidelines for using PAADhyvex</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Acceptance of Terms</h2>
          <p className={styles.text}>
            By accessing and using PAADhyvex, you accept and agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our services.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Eligibility</h2>
          <p className={styles.text}>
            You must be at least 13 years old to use PAADhyvex. By using our services, you represent that you meet this requirement.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>User Accounts</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>You are responsible for maintaining the confidentiality of your account</li>
            <li className={styles.listItem}>You must provide accurate and complete information</li>
            <li className={styles.listItem}>You are responsible for all activities under your account</li>
            <li className={styles.listItem}>Notify us immediately of any unauthorized access</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Service Usage</h2>
          <p className={styles.text}>
            PAADhyvex provides menstrual health management services including:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Pad distribution and allocation</li>
            <li className={styles.listItem}>Cycle tracking and predictions</li>
            <li className={styles.listItem}>Communication with distributors and administrators</li>
            <li className={styles.listItem}>Health insights and reports</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Prohibited Activities</h2>
          <p className={styles.text}>You agree not to:</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Misuse or abuse the service</li>
            <li className={styles.listItem}>Provide false information</li>
            <li className={styles.listItem}>Share your account with others</li>
            <li className={styles.listItem}>Attempt to access unauthorized areas</li>
            <li className={styles.listItem}>Harass or harm other users</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Service Availability</h2>
          <p className={styles.text}>
            We strive to provide continuous service but cannot guarantee uninterrupted access. 
            We reserve the right to modify or discontinue services with or without notice.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitation of Liability</h2>
          <p className={styles.text}>
            PAADhyvex is provided "as is" without warranties. We are not liable for any damages arising from your use of the service. 
            The information provided is for educational purposes and should not replace professional medical advice.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Changes to Terms</h2>
          <p className={styles.text}>
            We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.text}>
            For questions about these Terms of Service, contact us at support@paadhyvex.org
          </p>
        </div>

        <div className={styles.section}>
          <p className={styles.text}>
            <em>Last updated: January 2025</em>
          </p>
        </div>
      </div>
    </div>
  );
}
