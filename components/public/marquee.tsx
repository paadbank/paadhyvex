import type { ReactNode } from 'react';
import styles from './marquee.module.css';

/**
 * Content moving steadily past, for as long as the page is open. The track holds the content twice
 * and travels exactly one copy's length, so the loop has no visible seam. It stops on hover and for
 * anyone who has asked for reduced motion.
 */
export function Marquee({ children, copy, direction = 'left', seconds = 40 }: {
  children: ReactNode;
  /** The second pass, hidden from screen readers. Defaults to `children`. */
  copy?: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  seconds?: number;
}) {
  return (
    <div className={styles.marquee} data-direction={direction} style={{ '--seconds': `${seconds}s` } as React.CSSProperties}>
      <div className={styles.track}>
        <div className={styles.group}>{children}</div>
        <div className={styles.group} aria-hidden="true">{copy ?? children}</div>
      </div>
    </div>
  );
}
