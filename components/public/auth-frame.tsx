'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Mark, Wordmark } from '@/components/ui/logo';
import { TAGLINE } from '@/lib/brand';
import styles from './auth-frame.module.css';

/** Every sign-in screen: a single column on a phone, with the name beside it on a wide screen. */
export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={styles.frame}>
      <main className={styles.column}>
        <Link href="/" className={styles.brand} aria-label="PAADhyvex home">
          <Mark size={32} />
          <Wordmark />
        </Link>
        <div className={styles.heading}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </main>
      <aside className={styles.aside}>
        <p>{TAGLINE}</p>
      </aside>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return <p className={styles.error} role="alert">{children}</p>;
}

export function FormNotice({ children }: { children: ReactNode }) {
  return <p className={styles.notice} role="status">{children}</p>;
}
