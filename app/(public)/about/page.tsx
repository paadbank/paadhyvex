'use client';

import Link from 'next/link';
import { PillarIndex, SiteFooter, SiteHeader } from '@/components/public/site';
import landing from '@/app/page.module.css';
import styles from '../public-page.module.css';

const JOURNEY = [
  ['17th March', 'Breakthrough Group of Schools: 20 students and 6 teachers reached (26 people)'],
  ['18th March', 'Holy Trinity School: 30 students and 1 teacher reached'],
  ['18th March', 'Emmanuel College: 12 students reached'],
  ['31st March', 'Holy Trinity Grammar School: 46 girls reached'],
  ['31st March', 'A woman in the community who approached us and shared her struggle also received support'],
];

const VALUES = [
  ['Dignity', 'Every person deserves access to menstrual products without shame or stigma.'],
  ['Accessibility', 'PAADHYVEX is not just for students. It is for every girl, every woman, every voice that has been silenced by lack.'],
  ['Community', 'We build supportive networks that empower individuals and connect them to resources.'],
  ['Action', 'Not later, not eventually: now. Urgency and compassion drive everything we do.'],
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <div className={styles.hero}>
        <h1 className={styles.title}>About PAADhyvex</h1>
        <p className={styles.subtitle}>PAADHYVEX did not begin as a plan. It began as a question.</p>
      </div>

      <main className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How it began</h2>
          <p className={styles.text}>
            In the second week of November, quiet conversations with female students revealed something many people rarely think about: access to sanitary pads. What should be a basic necessity was a daily struggle. Some girls spoke about the stress of affording pads. Others admitted, almost in whispers, that they still relied on rags, tissues or cotton wool: unsafe alternatives that put their health, dignity and confidence at risk.
          </p>
          <p className={styles.text}>That moment stayed. It became impossible to ignore. And in that moment of urgency and compassion, PAADHYVEX was born.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What PAADHYVEX means</h2>
          <p className={styles.text}>PAADHYVEX is more than a name. It is a movement, and its letters say what it stands for.</p>
          <PillarIndex />
          <p className={styles.promise}>One pad at a time, restoring dignity and changing lives.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The journey so far</h2>
          <p className={styles.text}>In February, the vision was shared with an aunt who runs an NGO focused on supporting the girl child. She believed immediately and provided sanitary pads. That act of belief moved PAADHYVEX from idea into action.</p>
          <p className={styles.text}>By March, the journey had begun in Sabogida Ora:</p>
          <ol className={styles.list}>
            {JOURNEY.map(([date, event], i) => <li key={i} className={styles.listItem}><strong>{date}.</strong> {event}</li>)}
          </ol>
          <p className={styles.text}>In March alone, PAADHYVEX distributed <strong>116 sanitary pads</strong>: 116 lives touched, 116 stories impacted, 116 reasons to keep going.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Our values</h2>
          <ul className={styles.list}>
            {VALUES.map(([name, body]) => <li key={name} className={styles.listItem}><strong>{name}.</strong> {body}</li>)}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Get involved</h2>
          <p className={styles.text}>PAADHYVEX is a growing vision, but it cannot stand alone. It needs partners, sponsors and people willing to be part of something meaningful and lasting.</p>
          <p className={styles.text}>Your support goes beyond donations. It becomes access. It becomes confidence. It becomes dignity for a girl who needs it most.</p>
          <p className={styles.text}>Because together, we can reach more than 116. Together, we can rewrite more stories. Together, we can solve this, one pad at a time.</p>
          <div className={styles.actions}>
            <Link href="/signup" className={landing.primary}>Join PAADHYVEX</Link>
            <Link href="/stories" className={landing.secondary}>Read our stories</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
