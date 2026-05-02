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
        <p className={styles.subtitle}>
          Protection. Access. Awareness. Dignity. Hygiene. Value. Empowerment. eXpression.
        </p>
      </div>

      <div className={styles.content}>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>How It Began</h2>
          <p className={styles.text}>
            PAADHYVEX did not begin as a plan. It began as a question.
          </p>
          <p className={styles.text}>
            In the second week of November, quiet conversations with female students revealed something many people rarely think about: access to sanitary pads. What should be a basic necessity was a daily struggle. Some girls spoke about the stress of affording pads. Others admitted, almost in whispers, that they still relied on rags, tissues, or cotton wool — unsafe alternatives that put their health, dignity, and confidence at risk.
          </p>
          <p className={styles.text}>
            That moment stayed. It became impossible to ignore. And in that moment of urgency and compassion, PAADHYVEX was born.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>What PAADHYVEX Means</h2>
          <p className={styles.text}>
            PAADHYVEX is more than a name. It is a movement. Each letter stands for a core value:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>P</strong> — Protection</li>
            <li className={styles.listItem}><strong>A</strong> — Access</li>
            <li className={styles.listItem}><strong>A</strong> — Awareness</li>
            <li className={styles.listItem}><strong>D</strong> — Dignity</li>
            <li className={styles.listItem}><strong>H</strong> — Hygiene</li>
            <li className={styles.listItem}><strong>Y</strong> — Value</li>
            <li className={styles.listItem}><strong>V</strong> — Empowerment</li>
            <li className={styles.listItem}><strong>EX</strong> — eXpression</li>
          </ul>
          <p className={styles.text}>
            At its core, it stands for a simple but powerful promise: <em>one pad at a time, restoring dignity and changing lives.</em>
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>The Journey So Far</h2>
          <p className={styles.text}>
            In February, the vision was shared with an aunt who runs an NGO focused on supporting the girl child. She believed immediately and provided sanitary pads — that act of belief moved PAADHYVEX from idea into action.
          </p>
          <p className={styles.text}>
            By March, the journey had begun in Sabogida Ora:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>17th March</strong> — Breakthrough Group of Schools: 20 students + 6 teachers reached (26 people)</li>
            <li className={styles.listItem}><strong>18th March</strong> — Holy Trinity School: 30 students + 1 teacher reached</li>
            <li className={styles.listItem}><strong>18th March</strong> — Emmanuel College: 12 students reached</li>
            <li className={styles.listItem}><strong>31st March</strong> — Holy Trinity Grammar School: 46 girls reached</li>
            <li className={styles.listItem}><strong>31st March</strong> — A woman in the community who approached and shared her struggle also received support</li>
          </ul>
          <p className={styles.text}>
            In March alone, PAADHYVEX distributed <strong>116 sanitary pads</strong> — 116 lives touched, 116 stories impacted, 116 reasons to keep going.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Values</h2>
          <p className={styles.text}>
            <strong>Dignity:</strong> Every person deserves access to menstrual products without shame or stigma.
          </p>
          <p className={styles.text}>
            <strong>Accessibility:</strong> PAADHYVEX is not just for students. It is for every girl, every woman, every voice that has been silenced by lack.
          </p>
          <p className={styles.text}>
            <strong>Community:</strong> We build supportive networks that empower individuals and connect them to resources.
          </p>
          <p className={styles.text}>
            <strong>Action:</strong> Not later, not eventually — now. Urgency and compassion drive everything we do.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Get Involved</h2>
          <p className={styles.text}>
            PAADHYVEX is a growing vision, but it cannot stand alone. It needs partners, sponsors, and people willing to be part of something meaningful and lasting.
          </p>
          <p className={styles.text}>
            Your support goes beyond donations — it becomes access. It becomes confidence. It becomes dignity for a girl who needs it most.
          </p>
          <p className={styles.text}>
            <strong>Partner with us. Sponsor a girl. Fund an outreach. Amplify this mission.</strong>
          </p>
          <p className={styles.text}>
            Because together, we can reach more than 116. Together, we can rewrite more stories. Together, we can solve this — one pad at a time.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/signup')} className={styles.backBtn} style={{ background: '#dc2626', border: 'none' }}>
              Join PAADHYVEX
            </button>
            <button onClick={() => router.push('/stories')} className={styles.backBtn} style={{ background: 'transparent', border: '2px solid #dc2626', color: '#dc2626' }}>
              Read Our Stories
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
