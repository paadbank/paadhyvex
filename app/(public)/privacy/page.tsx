'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from '../public-page.module.css';

export default function PrivacyPage() {
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
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>How we protect your information</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Information We Collect</h2>
          <p className={styles.text}>
            We collect information you provide when creating an account, including your name, email, phone number, 
            and date of birth. We also collect menstrual cycle data you choose to log in the app.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>How We Use Your Information</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>To provide and manage pad distribution services</li>
            <li className={styles.listItem}>To track and predict your menstrual cycle</li>
            <li className={styles.listItem}>To communicate with you about deliveries and updates</li>
            <li className={styles.listItem}>To improve our services and user experience</li>
            <li className={styles.listItem}>To ensure the security of your account</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Security</h2>
          <p className={styles.text}>
            We implement industry-standard security measures to protect your personal information. Your data is encrypted 
            in transit and at rest. We use Supabase for secure authentication and database management.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Sharing</h2>
          <p className={styles.text}>
            We do not sell your personal information. We only share data with:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Assigned distributors (only delivery-related information)</li>
            <li className={styles.listItem}>Administrators (for service management)</li>
            <li className={styles.listItem}>Service providers who help us operate the platform</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Rights</h2>
          <p className={styles.text}>
            You have the right to access, update, or delete your personal information at any time. 
            You can manage your data through your profile settings or contact us for assistance.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact Us</h2>
          <p className={styles.text}>
            If you have questions about this Privacy Policy, please contact us at support@paadhyvex.org
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
