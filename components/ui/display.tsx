'use client';

import type { ReactNode } from 'react';
import { initial, label } from '@/lib/format';
import { ChevronIcon } from './icons';
import styles from './ui.module.css';

export type Stat = { label: string; value: ReactNode; tone?: 'positive' | 'negative' };

/**
 * The figures at the top of a page, as one block rather than a row of cards. The first is the one
 * that page is about, so it takes the serif at full size; the rest sit under it.
 */
export function Stats({ stats }: { stats: Stat[] }) {
  const [lead, ...rest] = stats;
  return (
    <dl className={styles.stats}>
      <div className={styles.statLead}>
        <dt>{lead.label}</dt>
        <dd data-tone={lead.tone}>{lead.value}</dd>
      </div>
      {rest.length > 0 && (
        <div className={styles.statRest} data-count={rest.length}>
          {rest.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <dt>{stat.label}</dt>
              <dd data-tone={stat.tone}>{stat.value}</dd>
            </div>
          ))}
        </div>
      )}
    </dl>
  );
}

const TONES: Record<string, 'positive' | 'caution' | 'negative' | 'neutral'> = {
  active: 'positive',
  completed: 'positive',
  closed: 'neutral',
  published: 'positive',
  pending: 'caution',
  open: 'caution',
  in_transit: 'caution',
  requires_update: 'caution',
  draft: 'neutral',
  failed: 'negative',
  inactive: 'negative',
};

export function Badge({ value }: { value: string }) {
  return <span className={styles.badge} data-tone={TONES[value] ?? 'neutral'}>{label(value)}</span>;
}

export function Avatar({ name }: { name?: string | null }) {
  return <span className={styles.avatar} aria-hidden="true">{initial(name)}</span>;
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.section}>
      {(title || action) && (
        <div className={styles.sectionHead}>
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

/** A row in a list. With `onClick` the whole row is the control and shows a chevron. */
export function Row({ leading, title, meta, trailing, onClick, children }: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      {leading && <span className={styles.rowLeading}>{leading}</span>}
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </span>
      {trailing && <span className={styles.rowTrailing}>{trailing}</span>}
      {onClick && <span className={styles.rowChevron}><ChevronIcon size="18px" /></span>}
    </>
  );
  return (
    <li className={styles.rowItem}>
      {onClick ? (
        <button type="button" className={styles.row} onClick={onClick}>{body}</button>
      ) : (
        <div className={styles.row}>{body}</div>
      )}
      {children && <div className={styles.rowExtra}>{children}</div>}
    </li>
  );
}

/** A detail page: what it's about, with its controls beside it on a wide screen and under it on a phone. */
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.column}>{main}</div>
      <div className={styles.column}>{side}</div>
    </div>
  );
}

/** Who a detail page is about. */
export function Identity({ name, detail, trailing }: { name: string; detail?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className={styles.identity}>
      <span className={styles.identityAvatar} aria-hidden="true">{initial(name)}</span>
      <div>
        <h2>{name}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {trailing}
    </div>
  );
}

/** Label and value pairs for a detail page. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className={styles.facts}>
      {items.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
